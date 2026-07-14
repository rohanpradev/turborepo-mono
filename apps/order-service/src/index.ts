import { connectOrderDB, disconnectOrderDB } from "@repo/order-db";
import { app } from "@/app";
import { orderServiceRuntime } from "@/runtime";
import { consumer, ensureOrderKafkaTopics } from "@/utils/kafka";
import { runKafkaSubscriptions } from "@/utils/subscriptions";

const port = +(process.env.PORT ?? 8001);
const DEPENDENCY_RETRY_MAX_MS = 30_000;
let isShuttingDown = false;
let dependencyRetryTimer: ReturnType<typeof setTimeout> | undefined;

const retryDelay = (attempt: number) =>
  Math.min(DEPENDENCY_RETRY_MAX_MS, 1_000 * 2 ** Math.min(attempt, 5));

const bootstrap = async (attempt = 0): Promise<void> => {
  if (isShuttingDown) return;

  let failed = false;

  try {
    await connectOrderDB();
    orderServiceRuntime.markReady("database");
    console.log("Connected to MongoDB");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MongoDB bootstrap failed.";
    failed = true;
    orderServiceRuntime.markNotReady("database", message);
    console.error("Failed to initialize MongoDB:", error);
  }

  try {
    await ensureOrderKafkaTopics();
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

  if (!failed || isShuttingDown) return;

  const delay = retryDelay(attempt);
  console.warn(`Retrying order-service dependencies in ${delay}ms.`);
  dependencyRetryTimer = setTimeout(() => void bootstrap(attempt + 1), delay);
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
  if (dependencyRetryTimer) clearTimeout(dependencyRetryTimer);
  orderServiceRuntime.markNotReady(
    "kafka.consumer",
    `Shutdown triggered by ${signal}.`,
  );

  const results = await Promise.allSettled([
    consumer.shutdown(),
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
