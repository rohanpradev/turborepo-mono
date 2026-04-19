import { createHealthRoutes } from "@repo/hono-utils";
import { orderServiceRuntime } from "@/runtime";

export const healthRoutes = createHealthRoutes(orderServiceRuntime);
