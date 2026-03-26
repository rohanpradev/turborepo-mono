import { Order } from "@repo/order-db";
import type { OrderRecord } from "@repo/types";

type CreateOrderInput = Omit<OrderRecord, "_id" | "createdAt" | "updatedAt">;

export const createOrder = async (order: CreateOrderInput) => {
  const newOrder = new Order(order);
  await newOrder.save();
  console.log(`Order created: ${newOrder._id}`);
};
