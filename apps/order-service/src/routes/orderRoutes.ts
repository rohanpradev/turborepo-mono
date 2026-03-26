import {
  bearerSecurity,
  createListResponseSchema,
  createRoute,
  createServiceRouter,
  errorResponseSchema,
  jsonContent,
} from "@repo/hono-utils";
import { orderRecordSchema } from "@repo/types";
import type { ServiceVariables } from "../middleware/auth";
import { shouldBeAdmin, shouldBeUser } from "../middleware/auth";
import { OrderService } from "../services/OrderService";

const orderListResponseSchema =
  createListResponseSchema(orderRecordSchema).openapi("OrderListResponse");

const listUserOrdersRoute = createRoute({
  method: "get",
  path: "/api/user-order",
  tags: ["orders"],
  summary: "List current user orders",
  description:
    "Returns the authenticated user's orders from the Kafka-backed order read model.",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  responses: {
    200: {
      description: "Orders retrieved successfully.",
      content: jsonContent(orderListResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    503: {
      description: "Authentication is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

const listAllOrdersRoute = createRoute({
  method: "get",
  path: "/api/orders",
  tags: ["orders"],
  summary: "List all orders",
  description:
    "Returns all orders from the Kafka-backed order read model. This endpoint is for admins only.",
  security: bearerSecurity,
  middleware: [shouldBeAdmin],
  responses: {
    200: {
      description: "Orders retrieved successfully.",
      content: jsonContent(orderListResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    403: {
      description: "The caller is authenticated but not authorized.",
      content: jsonContent(errorResponseSchema),
    },
    503: {
      description: "Authentication is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

export const orderRoutes = createServiceRouter<{
  Variables: ServiceVariables;
}>()
  .openapi(listUserOrdersRoute, async (c) => {
    const userId = c.get("userId");
    const orders = await OrderService.getUserOrders(userId);

    return c.json({ success: true as const, data: orders }, 200);
  })
  .openapi(listAllOrdersRoute, async (c) => {
    const orders = await OrderService.getAllOrders();

    return c.json({ success: true as const, data: orders }, 200);
  });
