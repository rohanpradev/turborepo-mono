import { createHealthRoutes } from "@repo/hono-utils";
import { paymentServiceRuntime } from "@/runtime";

export const healthRoutes = createHealthRoutes(paymentServiceRuntime);
