import { createServiceRuntime } from "@repo/hono-utils";

export const orderServiceRuntime = createServiceRuntime("order-service", [
  { name: "database" },
  { name: "kafka.producer" },
  { name: "kafka.consumer" },
] as const);
