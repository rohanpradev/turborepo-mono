import { Order } from "@repo/order-db";
import type { OrderRecord } from "@repo/types";

type StoredOrder = {
  _id: { toString(): string };
  userId: string;
  email: string;
  amount: number;
  status: "success" | "failed";
  products: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
};

const toOrderRecord = (order: StoredOrder) => {
  return {
    _id: order._id.toString(),
    userId: order.userId,
    email: order.email,
    amount: order.amount,
    status: order.status,
    products: order.products.map((product) => ({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    })),
    createdAt: order.createdAt?.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
  } satisfies OrderRecord;
};

export const OrderService = {
  async getUserOrders(userId: string): Promise<OrderRecord[]> {
    const orders = (await Order.find({ userId })
      .sort({ createdAt: -1 })
      .lean()) as StoredOrder[];
    return orders.map(toOrderRecord);
  },

  async getAllOrders(): Promise<OrderRecord[]> {
    const orders = (await Order.find()
      .sort({ createdAt: -1 })
      .lean()) as StoredOrder[];
    return orders.map(toOrderRecord);
  },
};
