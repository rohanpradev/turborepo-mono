import { describe, expect, test } from "bun:test";
import {
  type AdminPaymentActivity,
  buildCustomerSummaries,
} from "../apps/admin/src/lib/customer-summaries";
import type { OrderRecord } from "../packages/types/src";

const order = (overrides: Partial<OrderRecord> = {}): OrderRecord => ({
  _id: "order_record_1",
  orderId: "cs_projected",
  transactionId: "pi_projected",
  userId: "buyer",
  email: "buyer@example.com",
  amount: 1500,
  status: "success",
  products: [{ name: "Tee", price: 750, quantity: 2 }],
  createdAt: "2026-10-20T12:00:00.000Z",
  ...overrides,
});

const activity = (
  overrides: Partial<AdminPaymentActivity> = {},
): AdminPaymentActivity => ({
  amountCents: 1500,
  checkoutTimestamp: "2026-10-20T11:59:00.000Z",
  completedTimestamp: "2026-10-20T12:00:00.000Z",
  itemCount: 2,
  paymentIntentId: "pi_projected",
  sessionId: "cs_projected",
  status: "paid",
  userId: "buyer",
  ...overrides,
});

describe("admin customer summaries", () => {
  test("includes paid checkouts awaiting projection alongside existing orders", () => {
    const pendingProjection = activity({
      sessionId: "cs_waiting",
      paymentIntentId: "pi_waiting",
      amountCents: 500,
      itemCount: 1,
      completedTimestamp: "2026-10-21T12:00:00.000Z",
    });
    expect(
      buildCustomerSummaries([activity(), pendingProjection], [order()]),
    ).toEqual([
      {
        userId: "buyer",
        email: "buyer@example.com",
        paymentCount: 2,
        revenueCents: 2000,
        averageOrderValueCents: 1000,
        totalItems: 3,
        latestActivityAt: "2026-10-21T12:00:00.000Z",
      },
    ]);
  });

  test("reconciles by checkout session when a payment intent is absent", () => {
    const result = buildCustomerSummaries(
      [activity({ paymentIntentId: null })],
      [order({ transactionId: undefined })],
    );
    expect(result[0]?.paymentCount).toBe(1);
    expect(result[0]?.revenueCents).toBe(1500);
    expect(result[0]?.totalItems).toBe(2);
  });

  test("reconciles legacy orders through the payment intent", () => {
    const result = buildCustomerSummaries(
      [activity()],
      [order({ orderId: undefined })],
    );
    expect(result[0]?.paymentCount).toBe(1);
    expect(result[0]?.revenueCents).toBe(1500);
  });

  test("failed orders and unpaid checkouts add no paid revenue or items", () => {
    const result = buildCustomerSummaries(
      [activity({ status: "pending", completedTimestamp: null })],
      [order({ status: "failed" })],
    );
    expect(result[0]).toMatchObject({
      paymentCount: 0,
      revenueCents: 0,
      averageOrderValueCents: 0,
      totalItems: 0,
    });
  });

  test("a failed order cannot hide a later successful payment", () => {
    const result = buildCustomerSummaries(
      [activity()],
      [order({ status: "failed", amount: 9999 })],
    );
    expect(result[0]?.paymentCount).toBe(1);
    expect(result[0]?.revenueCents).toBe(1500);
  });

  test("duplicate snapshots cannot double count one payment", () => {
    const result = buildCustomerSummaries(
      [activity(), activity()],
      [order(), order({ _id: "order_record_copy" })],
    );
    expect(result[0]?.paymentCount).toBe(1);
    expect(result[0]?.revenueCents).toBe(1500);
    expect(result[0]?.totalItems).toBe(2);
  });

  test("equal purchases by the same customer remain separate payments", () => {
    const result = buildCustomerSummaries(
      [
        activity(),
        activity({ sessionId: "cs_second", paymentIntentId: "pi_second" }),
      ],
      [
        order(),
        order({
          _id: "second_record",
          orderId: "cs_second",
          transactionId: "pi_second",
        }),
      ],
    );
    expect(result[0]?.paymentCount).toBe(2);
    expect(result[0]?.revenueCents).toBe(3000);
    expect(result[0]?.totalItems).toBe(4);
  });

  test("activity-only customers are sorted by latest activity and exclude pending items", () => {
    const result = buildCustomerSummaries([
      activity({ userId: "paid-buyer" }),
      activity({
        userId: "pending-buyer",
        status: "pending",
        completedTimestamp: null,
        checkoutTimestamp: "2026-10-22T12:00:00.000Z",
      }),
    ]);
    expect(result.map((customer) => customer.userId)).toEqual([
      "pending-buyer",
      "paid-buyer",
    ]);
    expect(result[0]?.totalItems).toBe(0);
    expect(result[1]?.totalItems).toBe(2);
  });
});
