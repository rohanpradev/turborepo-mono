import { connectOrderDB, disconnectOrderDB } from "@repo/order-db";
import { app } from "./app";
import { orderServiceRuntime } from "./runtime";
import { consumer, ensureOrderKafkaTopics, producer } from "./utils/kafka";
import { runKafkaSubscriptions } from "./utils/subscriptions";

const port = +(process.env.PORT ?? 8001);
let isShuttingDown = false;

connectOrderDB()
  .then(async () => {
    orderServiceRuntime.markReady("database");
    console.log("Connected to MongoDB");
    await ensureOrderKafkaTopics();
    console.log("Kafka topics ready");
    await producer.start();
    orderServiceRuntime.markReady("kafka.producer");
    console.log("Kafka producer connected");
    await runKafkaSubscriptions();
    orderServiceRuntime.markReady("kafka.consumer");
    console.log("Kafka subscriptions started");
  })
  .catch((error: Error) => {
    orderServiceRuntime.markNotReady("database", error.message);
    orderServiceRuntime.markNotReady("kafka.producer", error.message);
    orderServiceRuntime.markNotReady("kafka.consumer", error.message);
    console.error("Failed to initialize services:", error);
    process.exit(1);
  });

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
