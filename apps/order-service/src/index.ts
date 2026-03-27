import { connectOrderDB, disconnectOrderDB } from "@repo/order-db";
import { app } from "./app";
import { orderServiceRuntime } from "./runtime";
import { consumer, ensureOrderKafkaTopics, producer } from "./utils/kafka";
import { runKafkaSubscriptions } from "./utils/subscriptions";

const port = +(process.env.PORT ?? 8001);
let isShuttingDown = false;

const bootstrap = async () => {
  try {
    await connectOrderDB();
    orderServiceRuntime.markReady("database");
    console.log("Connected to MongoDB");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MongoDB bootstrap failed.";
    orderServiceRuntime.markNotReady("database", message);
    console.error("Failed to initialize MongoDB:", error);
    process.exit(1);
  }

  try {
    await ensureOrderKafkaTopics();
    await producer.start();
    orderServiceRuntime.markReady("kafka.producer");
    console.log("Kafka producer connected");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Kafka producer bootstrap failed.";
    orderServiceRuntime.markNotReady("kafka.producer", message);
    console.error("Failed to initialize Kafka producer:", error);
    process.exit(1);
  }

  try {
    await runKafkaSubscriptions();
    orderServiceRuntime.markReady("kafka.consumer");
    console.log("Kafka subscriptions started");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Kafka consumer bootstrap failed.";
    orderServiceRuntime.markNotReady("kafka.consumer", message);
    console.error("Failed to initialize Kafka consumer:", error);
    process.exit(1);
  }
};

void bootstrap();

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down order service...`);
  orderServiceRuntime.markNotReady(
    "database",
    `Shutdown triggered by ${signal}.`,
  );
  orderServiceRuntime.markNotReady(
    "kafka.producer",
    `Shutdown triggered by ${signal}.`,
  );
  orderServiceRuntime.markNotReady(
    "kafka.consumer",
    `Shutdown triggered by ${signal}.`,
  );

  const results = await Promise.allSettled([
    consumer.shutdown(),
    producer.shutdown(),
    disconnectOrderDB(),
  ]);
  const failed = results.some((result) => result.status === "rejected");

  if (failed) {
    console.error("Order service shutdown completed with errors.", results);
  }

  process.exit(failed ? 1 : 0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

export default {
  port,
  fetch: app.fetch,
};
