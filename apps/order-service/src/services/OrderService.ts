import { Order } from "@repo/order-db";
import type { OrderRecord } from "@repo/types";

const toOrderRecord = (
  order: Awaited<ReturnType<typeof Order.find>>[number],
) => {
  const data = order.toObject();

  return {
    _id: order._id.toString(),
    userId: data.userId,
    email: data.email,
    amount: data.amount,
    status: data.status,
    products: data.products.map((product) => ({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    })),
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  } satisfies OrderRecord;
};

export const OrderService = {
  async getUserOrders(userId: string): Promise<OrderRecord[]> {
    const orders = await Order.find({ userId });
    return orders.map(toOrderRecord);
  },

  async getAllOrders(): Promise<OrderRecord[]> {
    const orders = await Order.find();
    return orders.map(toOrderRecord);
  },
};
