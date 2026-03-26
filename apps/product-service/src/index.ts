import { connectProductDB, disconnectProductDB } from "@repo/product-db";
import { app } from "./app";
import { productServiceRuntime } from "./runtime";
import { ensureProductKafkaTopics, producer } from "./utils/kafka";

const port = +(process.env.PORT ?? 3000);
let isShuttingDown = false;

const bootstrap = async () => {
  try {
    await connectProductDB();
    productServiceRuntime.markReady("database");
    console.log("Connected to product database");

    await ensureProductKafkaTopics();
    console.log("Kafka topics ready");

    await producer.start();
    productServiceRuntime.markReady("kafka.producer");
    console.log("Kafka producer connected");
  } catch (error) {
    productServiceRuntime.markNotReady(
      "database",
      error instanceof Error
        ? error.message
        : "Product database bootstrap failed.",
    );
    productServiceRuntime.markNotReady(
      "kafka.producer",
      error instanceof Error
        ? error.message
        : "Kafka producer bootstrap failed.",
    );
    console.error("Failed to initialize product service dependencies:", error);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }

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

  const results = await Promise.allSettled([
    producer.shutdown(),
    disconnectProductDB(),
  ]);
  const failed = results.some((result) => result.status === "rejected");

  if (failed) {
    console.error("Product service shutdown completed with errors.", results);
  }

  process.exit(failed ? 1 : 0);
};

void bootstrap();
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

export default {
  port,
  fetch: app.fetch,
};
