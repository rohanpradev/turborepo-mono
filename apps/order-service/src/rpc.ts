import { implement } from "@orpc/server";
import { orderContract } from "@repo/contracts";
import {
  getAuthenticatedAdminUserId,
  getAuthenticatedUserId,
} from "@repo/hono-utils";
import type { Context } from "hono";
import { OrderService } from "@/services/OrderService";

type RPCContext = {
  hono: Context;
};

const os = implement(orderContract).$context<RPCContext>();

export const orderRouter = os.router({
  order: {
    listAll: os.order.listAll.handler(async ({ context }) => {
      getAuthenticatedAdminUserId(context.hono);

      return {
        success: true as const,
        data: await OrderService.getAllOrders(),
      };
    }),
    listForUser: os.order.listForUser.handler(async ({ context }) => {
      const userId = getAuthenticatedUserId(context.hono);

      return {
        success: true as const,
        data: await OrderService.getUserOrders(userId),
      };
    }),
  },
});
