import { createHealthRoutes } from "@repo/hono-utils";
import { orderServiceRuntime } from "@/runtime";
import { consumer } from "../utils/kafka";

export const healthRoutes = createHealthRoutes(orderServiceRuntime, () =>
  consumer.metrics(),
);
