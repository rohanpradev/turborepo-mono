import {
  getPaymentIntegrationEvents,
  getPaymentServiceServerUrl,
  getProductServiceServerUrl,
  getOrderServiceServerUrl,
  listCategories,
  listOrders,
  listProducts,
  type PaymentIntegrationEventsResponse,
} from "@repo/api-client";
import type { CategoryRecord, OrderRecord, ProductRecord } from "@repo/types";
import { auth } from "@clerk/nextjs/server";

type IntegrationEvent = PaymentIntegrationEventsResponse["data"]["recentEvents"][number];

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

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getStorefrontUrl = () =>
  process.env.CLIENT_APP_URL ?? "http://localhost:3002";

export const getStorefrontAssetUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, getStorefrontUrl()).toString();
};

export const getStorefrontProductUrl = (productId: number) =>
  new URL(`/products/${productId}`, getStorefrontUrl()).toString();

export const formatCustomerLabel = (userId: string) =>
  userId === "unknown"
    ? "Unknown / test session"
    : `Customer ${userId.slice(0, 8)}`;

export const formatTimestamp = (timestamp: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

export const loadPaymentEvents = async () => {
  const response = await getPaymentIntegrationEvents(
    getPaymentServiceServerUrl(),
    liveFetchOptions,
  );

  return response.data.recentEvents;
};

export const buildPaymentActivities = (
  events: Array<IntegrationEvent>,
): Array<AdminPaymentActivity> => {
  const activities = new Map<string, AdminPaymentActivity>();

  for (const event of events) {
    if (event.type !== "checkout.session.created") {
      continue;
    }

    const sessionId = event.details?.sessionId;
    const userId = event.details?.userId;

    if (!isString(sessionId) || !isString(userId)) {
      continue;
    }

    const itemCount = isNumber(event.details?.itemCount) ? event.details.itemCount : 0;

    activities.set(sessionId, {
      amountCents: isNumber(event.details?.totalAmount)
        ? event.details.totalAmount
        : 0,
      checkoutTimestamp: event.timestamp,
      completedTimestamp: null,
      itemCount,
      paymentIntentId: null,
      sessionId,
      status: "pending",
      userId,
    });
  }

  for (const event of events) {
    if (event.type !== "payment.successful.published") {
      continue;
    }

    const sessionId = event.details?.orderId;
    if (!isString(sessionId)) {
      continue;
    }

    const existing = activities.get(sessionId);
    if (!existing) {
      continue;
    }

    activities.set(sessionId, {
      ...existing,
      amountCents: isNumber(event.details?.amount) ? event.details.amount : existing.amountCents,
      completedTimestamp: event.timestamp,
      itemCount: isNumber(event.details?.itemCount)
        ? event.details.itemCount
        : existing.itemCount,
      paymentIntentId: isString(event.details?.transactionId)
        ? event.details.transactionId
        : null,
      status: "paid",
    });
  }

  return Array.from(activities.values()).sort((left, right) => {
    const leftTimestamp = left.completedTimestamp ?? left.checkoutTimestamp;
    const rightTimestamp = right.completedTimestamp ?? right.checkoutTimestamp;
    return rightTimestamp.localeCompare(leftTimestamp);
  });
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
    const revenueCents = userOrders.reduce((total, order) => total + order.amount, 0);
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
  const session = await auth();
  if (!session.userId) {
    return null;
  }

  const token = await session.getToken();
  if (!token) {
    return null;
  }

  try {
    const response = await listOrders(getOrderServiceServerUrl(), { token });
    return response.data;
  } catch {
    return null;
  }
};

export const loadCatalogSnapshot = async (): Promise<{
  categories: Array<CategoryRecord>;
  products: Array<ProductRecord>;
}> => {
  const productServiceUrl = getProductServiceServerUrl();
  const [products, categories] = await Promise.all([
    listProducts(
      productServiceUrl,
      {
        limit: 24,
        sort: "newest",
      },
      liveFetchOptions,
    ),
    listCategories(productServiceUrl),
  ]);

  return {
    categories: categories.data,
    products: products.data,
  };
};
