import { createServiceRuntime } from "@repo/hono-utils";

export const paymentServiceRuntime = createServiceRuntime("payment-service", [
  { name: "database" },
  { name: "kafka.producer", required: false },
  { name: "kafka.consumer", required: false },
  { name: "stripe.api", required: false },
  { name: "stripe.webhook" },
] as const);
