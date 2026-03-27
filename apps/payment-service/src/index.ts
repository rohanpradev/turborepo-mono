import { app } from "./app";
import { recordIntegrationEvent } from "./observability/integrationEvents";
import { paymentServiceRuntime } from "./runtime";
import { consumer, ensurePaymentKafkaTopics, producer } from "./utils/kafka";
import { isStripeConfigured } from "./utils/stripe";
import { runKafkaSubscriptions } from "./utils/subscriptions";

const port = +(process.env.PORT ?? 8002);
let isShuttingDown = false;

const bootstrap = async () => {
  try {
    await ensurePaymentKafkaTopics();
    await producer.start();
    paymentServiceRuntime.markReady("kafka.producer");
    recordIntegrationEvent({
      source: "service",
      type: "kafka.producer.ready",
      message: "Kafka producer connected for payment events.",
    });
    console.log("Kafka producer connected");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Kafka producer bootstrap failed.";

    paymentServiceRuntime.markNotReady("kafka.producer", message);
    recordIntegrationEvent({
      source: "service",
      type: "kafka.producer.failed",
      message: "Payment service Kafka producer bootstrap failed.",
      details: {
        reason: message,
      },
    });
    console.error("Failed to initialize payment Kafka producer:", error);
    process.exit(1);
  }

  try {
    await runKafkaSubscriptions();
    paymentServiceRuntime.markReady("kafka.consumer");
    recordIntegrationEvent({
      source: "service",
      type: "kafka.consumer.ready",
      message: "Kafka consumer connected for product catalog sync.",
    });
    console.log("Kafka subscriptions started");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Kafka consumer bootstrap failed.";

    paymentServiceRuntime.markNotReady("kafka.consumer", message);
    recordIntegrationEvent({
      source: "service",
      type: "kafka.consumer.failed",
      message: "Payment service Kafka consumer bootstrap failed.",
      details: {
        reason: message,
      },
    });
    console.error("Failed to initialize payment Kafka consumer:", error);
    process.exit(1);
  }

  if (isStripeConfigured()) {
    paymentServiceRuntime.markReady("stripe", "Stripe API keys configured.");
    recordIntegrationEvent({
      source: "service",
      type: "stripe.ready",
      message: "Stripe integration is configured.",
    });
    return;
  }

  paymentServiceRuntime.markDisabled(
    "stripe",
    "Stripe API keys are not configured for this environment.",
  );
  recordIntegrationEvent({
    source: "service",
    type: "stripe.disabled",
    message: "Stripe integration is disabled in this environment.",
  });
};

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down payment service...`);
  paymentServiceRuntime.markNotReady(
    "kafka.producer",
    `Shutdown triggered by ${signal}.`,
  );
  paymentServiceRuntime.markNotReady(
    "kafka.consumer",
    `Shutdown triggered by ${signal}.`,
  );
  paymentServiceRuntime.markNotReady(
    "stripe",
    `Shutdown triggered by ${signal}.`,
  );
  recordIntegrationEvent({
    source: "service",
    type: "shutdown.started",
    message: "Payment service shutdown started.",
    details: {
      signal,
    },
  });

  const results = await Promise.allSettled([
    producer.shutdown(),
    consumer.shutdown(),
  ]);
  const failed = results.some((result) => result.status === "rejected");

  if (failed) {
    console.error("Payment service shutdown completed with errors.", results);
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
