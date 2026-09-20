import {
  createShutdownHandler,
  getServerIdleTimeoutSeconds,
  SERVICE_MAX_REQUEST_BODY_SIZE_BYTES,
} from "@repo/hono-utils";
import { connectProductDB, disconnectProductDB } from "@repo/product-db";
import { app } from "@/app";
import { productServiceRuntime } from "@/runtime";
import {
  startProductOutboxRelay,
  stopProductOutboxRelay,
} from "@/services/ProductOutboxRelay";
import { ensureProductKafkaTopics, producer } from "@/utils/kafka";

const port = +(process.env.PORT ?? 3000);
let isShuttingDown = false;

const bootstrap = async () => {
  try {
    await connectProductDB();
    if (isShuttingDown) return;
    productServiceRuntime.markReady("database");
    console.log("Connected to product database");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Product database bootstrap failed.";
    productServiceRuntime.markNotReady("database", message);
    console.error("Failed to initialize product database:", error);
    process.exit(1);
  }

  try {
    await ensureProductKafkaTopics();
    if (isShuttingDown) return;
    await producer.start();
    productServiceRuntime.markReady("kafka.producer");
    console.log("Kafka producer connected");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Kafka producer bootstrap failed.";
    productServiceRuntime.markNotReady("kafka.producer", message);
    console.error("Failed to initialize product Kafka producer:", error);
  }
  if (!isShuttingDown) startProductOutboxRelay();
};

const server = Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: getServerIdleTimeoutSeconds(),
  maxRequestBodySize: SERVICE_MAX_REQUEST_BODY_SIZE_BYTES,
});

const shutdown = createShutdownHandler({
  name: "product-service",
  onShutdown: (signal) => {
    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down product service...`);
    productServiceRuntime.markNotReady(
      "database",
      `Shutdown triggered by ${signal}.`,
    );
    productServiceRuntime.markNotReady(
      "kafka.producer",
      `Shutdown triggered by ${signal}.`,
    );
  },
  steps: [
    { name: "HTTP requests", run: () => server.stop() },
    { name: "bootstrap", run: () => bootstrapPromise },
    { name: "outbox relay", run: stopProductOutboxRelay },
    { name: "Kafka producer", run: () => producer.shutdown() },
    { name: "database", run: disconnectProductDB },
  ],
});

const bootstrapPromise = bootstrap();
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
