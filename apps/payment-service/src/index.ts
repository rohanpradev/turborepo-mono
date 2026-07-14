import { app } from "@/app";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import { STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES } from "@/routes/webhookRoutes";
import { paymentServiceRuntime } from "@/runtime";
import { consumer, ensurePaymentKafkaTopics, producer } from "@/utils/kafka";
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "@/utils/stripe";
import { runKafkaSubscriptions } from "@/utils/subscriptions";

const port = +(process.env.PORT ?? 8002);
const DEPENDENCY_RETRY_MAX_MS = 30_000;
let isShuttingDown = false;
let kafkaRetryTimer: ReturnType<typeof setTimeout> | undefined;
let stripeRetryTimer: ReturnType<typeof setTimeout> | undefined;
let webhookSecretTimer: ReturnType<typeof setInterval> | undefined;

const retryDelay = (attempt: number) =>
  Math.min(DEPENDENCY_RETRY_MAX_MS, 1_000 * 2 ** Math.min(attempt, 5));

const connectKafka = async (attempt = 0): Promise<void> => {
  if (isShuttingDown) return;

  let failed = false;

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
    failed = true;
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
    failed = true;
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
  }

  if (!failed || isShuttingDown) return;

  const delay = retryDelay(attempt);
  console.warn(`Retrying payment Kafka dependencies in ${delay}ms.`);
  kafkaRetryTimer = setTimeout(() => void connectKafka(attempt + 1), delay);
};

const validateStripeApi = async (attempt = 0): Promise<void> => {
  if (isShuttingDown) return;

  const stripe = getStripeClient();

  if (!stripe || !isStripeConfigured()) {
    paymentServiceRuntime.markNotReady(
      "stripe.api",
      "A valid Stripe secret key is not configured.",
    );
    recordIntegrationEvent({
      source: "service",
      type: "stripe.disabled",
      message: "Stripe API integration is not configured.",
    });
    return;
  }

  try {
    await stripe.balance.retrieve();
    paymentServiceRuntime.markReady(
      "stripe.api",
      "Stripe API credential verified.",
    );
    recordIntegrationEvent({
      source: "service",
      type: "stripe.ready",
      message: "Stripe API credential verified.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe API verification failed.";
    paymentServiceRuntime.markNotReady("stripe.api", message);
    recordIntegrationEvent({
      source: "service",
      type: "stripe.failed",
      message: "Stripe API credential verification failed.",
      details: { reason: message },
    });
    const delay = retryDelay(attempt);
    console.error("Failed to verify the Stripe API credential:", error);
    console.warn(`Retrying Stripe API verification in ${delay}ms.`);
    stripeRetryTimer = setTimeout(
      () => void validateStripeApi(attempt + 1),
      delay,
    );
  }
};

const refreshWebhookSecretStatus = () => {
  if (getStripeWebhookSecret()) {
    paymentServiceRuntime.markReady(
      "stripe.webhook",
      "Stripe webhook signing secret available.",
    );
    return;
  }

  paymentServiceRuntime.markNotReady(
    "stripe.webhook",
    "A valid Stripe webhook signing secret is not available.",
  );
};

const bootstrap = () => {
  refreshWebhookSecretStatus();
  webhookSecretTimer = setInterval(refreshWebhookSecretStatus, 1_000);
  void connectKafka();
  void validateStripeApi();
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
    "stripe.api",
    `Shutdown triggered by ${signal}.`,
  );
  paymentServiceRuntime.markNotReady(
    "stripe.webhook",
    `Shutdown triggered by ${signal}.`,
  );
  if (kafkaRetryTimer) clearTimeout(kafkaRetryTimer);
  if (stripeRetryTimer) clearTimeout(stripeRetryTimer);
  if (webhookSecretTimer) clearInterval(webhookSecretTimer);
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

bootstrap();
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

export default {
  port,
  fetch: app.fetch,
  maxRequestBodySize: STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES,
};
