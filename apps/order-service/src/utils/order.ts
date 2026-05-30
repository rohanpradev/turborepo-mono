import { Order } from "@repo/order-db";
import type { OrderRecord } from "@repo/types";

type CreateOrderInput = Omit<OrderRecord, "_id" | "createdAt" | "updatedAt">;
type IdempotentOrderInput = CreateOrderInput & { orderId: string };

export const createOrder = async (order: IdempotentOrderInput) => {
  const result = await Order.updateOne(
    { orderId: order.orderId },
    { $setOnInsert: order },
    { upsert: true },
  );

  if (result.upsertedCount > 0) {
    console.log(`Order created: ${order.orderId}`);
    return;
  }

  console.log(`Order already exists: ${order.orderId}`);
};
