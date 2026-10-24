import type { listPaymentActivities } from "@repo/api-client";
import type { OrderRecord } from "@repo/types";

export type AdminPaymentActivity = Awaited<
  ReturnType<typeof listPaymentActivities>
>["data"][number];

type AdminCustomerSummary = {
  averageOrderValueCents: number;
  email: string | null;
  latestActivityAt: string;
  paymentCount: number;
  revenueCents: number;
  totalItems: number;
  userId: string;
};

type CustomerAccumulator = {
  summary: AdminCustomerSummary;
  paymentKeys: Set<string>;
};

const recordLatestActivity = (
  summary: AdminCustomerSummary,
  timestamp: string | undefined,
) => {
  if (timestamp && summary.latestActivityAt.localeCompare(timestamp) < 0) {
    summary.latestActivityAt = timestamp;
  }
};

// Orders project the same paid checkout. Match only stable identifiers, never
// amounts or customer identity: one customer may have several equal purchases.
const claimPayment = (
  paymentKeys: Set<string>,
  identifiers: {
    sessionId?: string;
    paymentIntentId?: string | null;
    recordId?: string;
  },
) => {
  const keys = [
    identifiers.sessionId ? `session:${identifiers.sessionId}` : null,
    identifiers.paymentIntentId
      ? `intent:${identifiers.paymentIntentId}`
      : null,
    identifiers.recordId ? `record:${identifiers.recordId}` : null,
  ].filter((key): key is string => key !== null);
  const duplicate = keys.some((key) => paymentKeys.has(key));
  for (const key of keys) paymentKeys.add(key);
  return !duplicate;
};

export const buildCustomerSummaries = (
  activities: Array<AdminPaymentActivity>,
  orders: Array<OrderRecord> = [],
): Array<AdminCustomerSummary> => {
  const customers = new Map<string, CustomerAccumulator>();
  const getCustomer = (userId: string) => {
    let customer = customers.get(userId);
    if (!customer) {
      customer = {
        summary: {
          averageOrderValueCents: 0,
          email: null,
          latestActivityAt: "",
          paymentCount: 0,
          revenueCents: 0,
          totalItems: 0,
          userId,
        },
        paymentKeys: new Set(),
      };
      customers.set(userId, customer);
    }
    return customer;
  };

  for (const order of orders) {
    const { summary, paymentKeys } = getCustomer(order.userId);
    summary.email ??= order.email;
    recordLatestActivity(summary, order.createdAt);
    recordLatestActivity(summary, order.updatedAt);
    if (
      order.status !== "success" ||
      !claimPayment(paymentKeys, {
        sessionId: order.orderId,
        paymentIntentId: order.transactionId,
        recordId: order._id,
      })
    ) {
      continue;
    }
    summary.paymentCount += 1;
    summary.revenueCents += order.amount;
    summary.totalItems += order.products.reduce(
      (total, product) => total + product.quantity,
      0,
    );
  }

  for (const activity of activities) {
    const { summary, paymentKeys } = getCustomer(activity.userId);
    recordLatestActivity(summary, activity.checkoutTimestamp);
    recordLatestActivity(summary, activity.completedTimestamp ?? undefined);
    if (
      activity.status !== "paid" ||
      !claimPayment(paymentKeys, {
        sessionId: activity.sessionId,
        paymentIntentId: activity.paymentIntentId,
      })
    ) {
      continue;
    }
    summary.paymentCount += 1;
    summary.revenueCents += activity.amountCents;
    summary.totalItems += activity.itemCount;
  }

  return Array.from(customers.values(), ({ summary }) => ({
    ...summary,
    averageOrderValueCents:
      summary.paymentCount > 0
        ? Math.round(summary.revenueCents / summary.paymentCount)
        : 0,
  })).sort((left, right) =>
    right.latestActivityAt.localeCompare(left.latestActivityAt),
  );
};
