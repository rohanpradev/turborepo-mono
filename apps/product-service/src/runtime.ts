import { createServiceRuntime } from "@repo/hono-utils";

export const productServiceRuntime = createServiceRuntime("product-service", [
  { name: "database" },
  { name: "kafka.producer" },
] as const);
