import { createServiceRuntime } from "@repo/hono-utils";

export const paymentServiceRuntime = createServiceRuntime("payment-service", [
  { name: "kafka.producer" },
  { name: "kafka.consumer" },
  { name: "stripe.api" },
  { name: "stripe.webhook" },
] as const);
