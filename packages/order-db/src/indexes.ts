import { Order } from "./order-model";

export const verifyOrderIndexes = async () => {
  const indexes = await Order.collection.indexes();
  const uniqueOrderId = indexes.some(
    (index) =>
      index.unique === true &&
      index.key.orderId === 1 &&
      Object.keys(index.key).length === 1 &&
      (!index.partialFilterExpression ||
        JSON.stringify(index.partialFilterExpression) ===
          JSON.stringify({ orderId: { $type: "string" } })),
  );

  if (!uniqueOrderId) {
    throw new Error(
      "Order idempotency index is missing. Run bun run --cwd packages/order-db db:deploy before starting consumers.",
    );
  }
};
