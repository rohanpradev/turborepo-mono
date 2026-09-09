import { describe, expect, test } from "bun:test";
import { Order } from "../packages/order-db/src/order-model";

const order = {
  orderId: "cs_test_order",
  userId: "user_test",
  email: "shopper@example.com",
  amount: 1999,
  status: "success",
  products: [{ name: "Everyday tee", price: 1999, quantity: 1 }],
};

describe("persisted order validation", () => {
  test("accepts integer minor units and a populated order", async () => {
    await expect(new Order(order).validate()).resolves.toBeUndefined();
  });
  test.each([-1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid amount %s",
    async (amount) => {
      await expect(
        new Order({ ...order, amount }).validate(),
      ).rejects.toThrow();
    },
  );
  test.each([0, -1, 1.5])("rejects invalid quantity %s", async (quantity) => {
    await expect(
      new Order({
        ...order,
        products: [{ ...order.products[0], quantity }],
      }).validate(),
    ).rejects.toThrow();
  });
  test("rejects an empty order", async () => {
    await expect(
      new Order({ ...order, products: [] }).validate(),
    ).rejects.toThrow();
  });
});
