import { Order } from "@repo/order-db";
import type { OrderRecord } from "@repo/types";

type CreateOrderInput = Omit<OrderRecord, "_id" | "createdAt" | "updatedAt">;
type IdempotentOrderInput = CreateOrderInput & { orderId: string };

export const createOrder = async (order: IdempotentOrderInput) => {
  // Validate the complete insert. Update validators do not validate untouched
  // fields, and upsert must never persist malformed event payloads.
  await new Order(order).validate();
  const insertedAt = new Date();
  const result = await Order.updateOne(
    { orderId: order.orderId },
    {
      $setOnInsert: {
        ...order,
        createdAt: insertedAt,
        updatedAt: insertedAt,
      },
    },
    // Mongoose's automatic updatedAt would otherwise turn a duplicate delivery
    // into a write even though every business field uses $setOnInsert.
    { upsert: true, runValidators: true, timestamps: false },
  );

  if (result.upsertedCount > 0) {
    console.log(`Order created: ${order.orderId}`);
    return;
  }

  console.log(`Order already exists: ${order.orderId}`);
};
