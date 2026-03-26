import { createHealthRoutes } from "@repo/hono-utils";
import { productServiceRuntime } from "../runtime";

export const healthRoutes = createHealthRoutes(productServiceRuntime);
