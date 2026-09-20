import {
  createShutdownHandler,
  getServerIdleTimeoutSeconds,
  SERVICE_MAX_REQUEST_BODY_SIZE_BYTES,
} from "@repo/hono-utils";
import {
  connectOrderDB,
  disconnectOrderDB,
  Order,
  verifyOrderIndexes,
} from "@repo/order-db";
import { app } from "@/app";
import { orderServiceRuntime } from "@/runtime";
import { consumer, ensureOrderKafkaTopics } from "@/utils/kafka";
import { runKafkaSubscriptions } from "@/utils/subscriptions";

const port = +(process.env.PORT ?? 8001);
const DEPENDENCY_RETRY_MAX_MS = 30_000;
let isShuttingDown = false;
let bootstrapPromise: Promise<void> = Promise.resolve();
let dependencyRetryTimer: ReturnType<typeof setTimeout> | undefined;

const retryDelay = (attempt: number) =>
  Math.min(DEPENDENCY_RETRY_MAX_MS, 1_000 * 2 ** Math.min(attempt, 5));

const bootstrap = async (attempt = 0): Promise<void> => {
  if (isShuttingDown) return;

  let failed = false;

  try {
    await connectOrderDB();
    if (process.env.NODE_ENV !== "production") await Order.init();
    await verifyOrderIndexes();
    if (isShuttingDown) return;
    orderServiceRuntime.markReady("database");
    console.log("Connected to MongoDB");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MongoDB bootstrap failed.";
    failed = true;
    orderServiceRuntime.markNotReady("database", message);
    console.error("Failed to initialize MongoDB:", error);
  }

  if (!failed && !isShuttingDown) {
    try {
      await ensureOrderKafkaTopics();
      if (isShuttingDown) return;
      await runKafkaSubscriptions();
      orderServiceRuntime.markReady("kafka.consumer");
      console.log("Kafka subscriptions started");
    } catch (error) {
      failed = true;
      const message =
        error instanceof Error
          ? error.message
          : "Kafka consumer bootstrap failed.";
      orderServiceRuntime.markNotReady("kafka.consumer", message);
      console.error("Failed to initialize Kafka consumer:", error);
    }
  }

  if (!failed || isShuttingDown) return;

  const delay = retryDelay(attempt);
  console.warn(`Retrying order-service dependencies in ${delay}ms.`);
  dependencyRetryTimer = setTimeout(() => {
    bootstrapPromise = bootstrap(attempt + 1);
  }, delay);
};

bootstrapPromise = bootstrap();

const server = Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: getServerIdleTimeoutSeconds(),
  maxRequestBodySize: SERVICE_MAX_REQUEST_BODY_SIZE_BYTES,
});

const shutdown = createShutdownHandler({
  name: "order-service",
  onShutdown: (signal) => {
    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down order service...`);
    orderServiceRuntime.markNotReady(
      "database",
      `Shutdown triggered by ${signal}.`,
    );
    if (dependencyRetryTimer) clearTimeout(dependencyRetryTimer);
    orderServiceRuntime.markNotReady(
      "kafka.consumer",
      `Shutdown triggered by ${signal}.`,
    );
  },
  steps: [
    { name: "HTTP requests", run: () => server.stop() },
    { name: "bootstrap", run: () => bootstrapPromise },
    { name: "Kafka consumer", run: () => consumer.shutdown() },
    { name: "database", run: disconnectOrderDB },
  ],
});

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
