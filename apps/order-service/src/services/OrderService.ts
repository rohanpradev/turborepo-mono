import { Order } from "@repo/order-db";
import type { OrderRecord } from "@repo/types";

type StoredOrder = Omit<OrderRecord, "_id" | "createdAt" | "updatedAt"> & {
  _id: { toString(): string };
  createdAt?: Date;
  updatedAt?: Date;
};

const toOrderRecord = (order: StoredOrder) => {
  return {
    _id: order._id.toString(),
    orderId: order.orderId,
    userId: order.userId,
    email: order.email,
    amount: order.amount,
    status: order.status,
    currency: order.currency ?? "usd",
    transactionId: order.transactionId,
    fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
    deliveryAddress: order.deliveryAddress,
    products: order.products.map((product) => ({
      productId: product.productId,
      selectedSize: product.selectedSize,
      selectedColor: product.selectedColor,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    })),
    createdAt: order.createdAt?.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
  } satisfies OrderRecord;
};

const list = async (
  filter: { userId?: string },
  query: { page: number; limit: number },
) => {
  const records = (await Order.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit + 1)
    .maxTimeMS(3000)
    .lean()) as StoredOrder[];
  return {
    data: records.slice(0, query.limit).map(toOrderRecord),
    meta: {
      page: query.page,
      pageSize: query.limit,
      hasNextPage: records.length > query.limit,
    },
  };
};
export const OrderService = {
  getUserOrders: (userId: string, query: { page: number; limit: number }) =>
    list({ userId }, query),
  getAllOrders: (query: { page: number; limit: number }) => list({}, query),
};
