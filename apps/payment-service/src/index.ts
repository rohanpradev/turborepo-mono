import {
  createShutdownHandler,
  getServerIdleTimeoutSeconds,
  startBackgroundTask,
} from "@repo/hono-utils";
import { app } from "./app";
import {
  paymentMetricsUnavailable,
  refreshPaymentMetrics,
} from "./observability/paymentMetrics";
import { STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES } from "./routes/webhookRoutes";
import { paymentServiceRuntime as runtime } from "./runtime";
import {
  startPaymentWorkers,
  stopPaymentWorkers,
} from "./services/PaymentWorker";
import { reconcilePayments } from "./services/ReconciliationService";
import { closePaymentStore, getPaymentStore } from "./storage/payment-store";
import { consumer, ensurePaymentKafkaTopics, producer } from "./utils/kafka";
import { getStripeClient, getStripeWebhookSecret } from "./utils/stripe";
import { runKafkaSubscriptions } from "./utils/subscriptions";

const stopTasks: Array<() => Promise<void>> = [];
const server = Bun.serve({
  port: Number(process.env.PORT ?? 8002),
  fetch: app.fetch,
  idleTimeout: getServerIdleTimeoutSeconds(),
  maxRequestBodySize: STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES,
});
stopTasks.push(
  startBackgroundTask(
    async () => {
      await getPaymentStore().ready();
      await refreshPaymentMetrics();
      runtime.markReady("database");
      getStripeWebhookSecret()
        ? runtime.markReady("stripe.webhook")
        : runtime.markNotReady("stripe.webhook", "Signing secret unavailable.");
    },
    5000,
    () => {
      paymentMetricsUnavailable();
      runtime.markNotReady("database", "Payment storage is unavailable.");
    },
  ),
);
stopTasks.push(
  startBackgroundTask(
    async () => {
      const stripe = getStripeClient();
      if (!stripe) throw new Error("Stripe is not configured.");
      await stripe.balance.retrieve();
      runtime.markReady("stripe.api");
    },
    30000,
    () => runtime.markNotReady("stripe.api", "Stripe API unavailable."),
  ),
);
if (process.env.PAYMENT_WORKERS_ENABLED !== "false") {
  startPaymentWorkers();
  stopTasks.push(
    startBackgroundTask(
      async () => {
        await getPaymentStore().ready();
        await ensurePaymentKafkaTopics();
        await producer.start();
        await runKafkaSubscriptions();
        runtime.markReady("kafka.producer");
        consumer.isReady()
          ? runtime.markReady("kafka.consumer")
          : runtime.markNotReady("kafka.consumer", "Consumer is recovering.");
      },
      5000,
      () => {
        runtime.markNotReady("kafka.producer", "Broker unavailable.");
        runtime.markNotReady("kafka.consumer", "Consumer unavailable.");
      },
    ),
  );
  stopTasks.push(
    startBackgroundTask(
      () => reconcilePayments(),
      300000,
      () =>
        console.error(
          "Payment reconciliation failed; reservations remain held.",
        ),
    ),
  );
}
const shutdown = createShutdownHandler({
  name: "payment-service",
  onShutdown: () => {
    for (const dependency of runtime.snapshot().dependencies)
      runtime.markNotReady(
        dependency.name as "database",
        "Service is draining.",
      );
  },
  steps: [
    { name: "HTTP", run: () => server.stop() },
    {
      name: "background tasks",
      run: async () => {
        await Promise.all(stopTasks.map((stop) => stop()));
      },
    },
    { name: "payment workers", run: stopPaymentWorkers },
    { name: "Kafka consumer", run: () => consumer.shutdown() },
    { name: "Kafka producer", run: () => producer.shutdown() },
    { name: "payment storage", run: closePaymentStore },
  ],
});
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
