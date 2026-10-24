import { expect, spyOn, test } from "bun:test";
import { createOrder } from "../apps/order-service/src/utils/order";
import { Order } from "../packages/order-db/src/order-model";

test("payment replay leaves the stored order and its timestamps unchanged", async () => {
  const order = {
    orderId: "cs_test_replay",
    userId: "buyer",
    email: "buyer@example.com",
    amount: 1999,
    status: "success" as const,
    products: [{ name: "Original purchase", price: 1999, quantity: 1 }],
  };
  let stored: Record<string, unknown> | undefined;
  const update = spyOn(Order.collection, "updateOne").mockImplementation(
    async (_filter, changes) => {
      if (Array.isArray(changes)) throw new Error("Expected update operators.");
      const inserted = !stored;
      // Exercise Mongoose's real query casting and timestamp middleware; the
      // driver seam applies the same insert-only/update operators as MongoDB.
      if (inserted) stored = { ...changes.$setOnInsert };
      Object.assign(stored ?? {}, changes.$set);
      return {
        acknowledged: true,
        matchedCount: inserted ? 0 : 1,
        modifiedCount: inserted ? 0 : 1,
        upsertedCount: inserted ? 1 : 0,
        upsertedId: null,
      };
    },
  );
  try {
    await createOrder(order);
    const original = { ...stored };
    expect(original?.createdAt).toBeInstanceOf(Date);
    expect(original?.updatedAt).toEqual(original?.createdAt);
    await Bun.sleep(5);
    await createOrder({
      ...order,
      products: [{ name: "Changed replay", price: 1999, quantity: 1 }],
    });
    expect(stored).toEqual(original);
  } finally {
    update.mockRestore();
  }
});
