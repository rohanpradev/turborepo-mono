import "server-only";

import {
  type ListProductsResponse,
  listCategories,
  listOrders,
  listPaymentActivities,
  listProducts,
  type ProductListQuery,
} from "@repo/api-client";
import {
  getOrderServiceServerUrl,
  getPaymentServiceServerUrl,
  getProductServiceServerUrl,
} from "@repo/api-client/server";
import type { CategoryRecord, OrderRecord, ProductRecord } from "@repo/types";
import { requireAdminAccess } from "@/lib/auth";

export type AdminPaymentActivity = {
  amountCents: number;
  checkoutTimestamp: string;
  completedTimestamp: string | null;
  itemCount: number;
  paymentIntentId: string | null;
  sessionId: string;
  status: "paid" | "pending";
  userId: string;
};

export type AdminCustomerSummary = {
  averageOrderValueCents: number;
  email: string | null;
  latestActivityAt: string;
  paymentCount: number;
  revenueCents: number;
  totalItems: number;
  userId: string;
};

const liveFetchOptions = {
  cache: "no-store" as const,
};

const isString = (value: unknown): value is string => typeof value === "string";

export const formatCustomerLabel = (userId: string) =>
  userId === "unknown"
    ? "Unknown / test session"
    : `Customer ${userId.slice(0, 8)}`;

export const formatTimestamp = (timestamp: string) => {
  const value = new Date(timestamp);

  return Number.isNaN(value.getTime())
    ? "Timestamp unavailable"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);
};

export const loadPaymentActivities = async () => {
  const { token } = await requireAdminAccess();
  return (
    await listPaymentActivities(getPaymentServiceServerUrl(), {
      fetchOptions: liveFetchOptions,
      token,
    })
  ).data;
};

export const buildCustomerSummaries = (
  activities: Array<AdminPaymentActivity>,
  orders: Array<OrderRecord> = [],
): Array<AdminCustomerSummary> => {
  const ordersByUserId = new Map<string, Array<OrderRecord>>();
  for (const order of orders) {
    const userOrders = ordersByUserId.get(order.userId) ?? [];
    userOrders.push(order);
    ordersByUserId.set(order.userId, userOrders);
  }

  const customers = new Map<string, AdminCustomerSummary>();

  for (const [userId, userOrders] of ordersByUserId.entries()) {
    const revenueCents = userOrders.reduce(
      (total, order) => total + order.amount,
      0,
    );
    const paymentCount = userOrders.length;
    const totalItems = userOrders.reduce(
      (total, order) =>
        total +
        order.products.reduce(
          (productTotal, product) => productTotal + product.quantity,
          0,
        ),
      0,
    );
    const latestActivityAt =
      userOrders
        .map((order) => order.createdAt ?? order.updatedAt)
        .filter(isString)
        .sort((left, right) => right.localeCompare(left))[0] ?? "";

    customers.set(userId, {
      averageOrderValueCents:
        paymentCount > 0 ? Math.round(revenueCents / paymentCount) : 0,
      email: userOrders[0]?.email ?? null,
      latestActivityAt,
      paymentCount,
      revenueCents,
      totalItems,
      userId,
    });
  }

  for (const activity of activities) {
    const latestActivityAt =
      activity.completedTimestamp ?? activity.checkoutTimestamp;
    const existing = customers.get(activity.userId);
    const isOrderBacked = ordersByUserId.has(activity.userId);

    if (!existing) {
      customers.set(activity.userId, {
        averageOrderValueCents:
          activity.status === "paid" ? activity.amountCents : 0,
        email: null,
        latestActivityAt,
        paymentCount: activity.status === "paid" ? 1 : 0,
        revenueCents: activity.status === "paid" ? activity.amountCents : 0,
        totalItems: activity.itemCount,
        userId: activity.userId,
      });
      continue;
    }

    if (isOrderBacked) {
      customers.set(activity.userId, {
        ...existing,
        latestActivityAt:
          latestActivityAt > existing.latestActivityAt
            ? latestActivityAt
            : existing.latestActivityAt,
      });
      continue;
    }

    const paymentCount =
      existing.paymentCount + (activity.status === "paid" ? 1 : 0);
    const revenueCents =
      existing.revenueCents +
      (activity.status === "paid" ? activity.amountCents : 0);
    const totalItems = existing.totalItems + activity.itemCount;

    customers.set(activity.userId, {
      averageOrderValueCents:
        paymentCount > 0 ? Math.round(revenueCents / paymentCount) : 0,
      email: existing.email,
      latestActivityAt:
        latestActivityAt > existing.latestActivityAt
          ? latestActivityAt
          : existing.latestActivityAt,
      paymentCount,
      revenueCents,
      totalItems,
      userId: activity.userId,
    });
  }

  return Array.from(customers.values()).sort((left, right) =>
    right.latestActivityAt.localeCompare(left.latestActivityAt),
  );
};

export const loadOptionalAdminOrders = async () => {
  const { token } = await requireAdminAccess();

  try {
    const response = await listOrders(getOrderServiceServerUrl(), { token });
    return response.data;
  } catch {
    return null;
  }
};

export const loadCatalogSnapshot = async (
  query: ProductListQuery = {},
): Promise<{
  categories: Array<CategoryRecord>;
  products: Array<ProductRecord>;
  pagination: ListProductsResponse["meta"];
}> => {
  await requireAdminAccess();
  const productServiceUrl = getProductServiceServerUrl();
  const [products, categories] = await Promise.all([
    listProducts(
      productServiceUrl,
      {
        limit: 24,
        sort: "newest",
        ...query,
      },
      liveFetchOptions,
    ),
    listCategories(productServiceUrl, liveFetchOptions),
  ]);

  return {
    categories: categories.data,
    products: products.data,
    pagination: products.meta,
  };
};
