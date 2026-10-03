import { createHealthRoutes } from "@repo/hono-utils";
import { paymentServiceRuntime } from "@/runtime";
import { paymentMetrics } from "../observability/paymentMetrics";
import { consumer } from "../utils/kafka";

export const healthRoutes = createHealthRoutes(
  paymentServiceRuntime,
  () => paymentMetrics() + consumer.metrics(),
);
