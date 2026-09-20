import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { createOrder } from "../apps/order-service/src/utils/order";
import { relayProductOutboxOnce } from "../apps/product-service/src/services/ProductOutboxRelay";
import { producer } from "../apps/product-service/src/utils/kafka";
import { nowUtc } from "../apps/product-service/src/utils/timestamps";
import {
  connectOrderDB,
  disconnectOrderDB,
  Order,
  verifyOrderIndexes,
} from "../packages/order-db/src";
import {
  connectProductDB,
  db,
  disconnectProductDB,
} from "../packages/product-db/src";

// This suite mutates index state and is intentionally serial in disposable DBs.
for (const name of ["DATABASE_URL", "MONGO_URL"]) {
  const value = process.env[name];
  if (!value || !new URL(value).pathname.endsWith("_test")) {
    throw new Error(
      "Use bun run test:integration with disposable *_test databases.",
    );
  }
}

beforeAll(async () => {
  await Promise.all([connectProductDB(), connectOrderDB()]);
});

afterAll(async () => {
  await Promise.allSettled([disconnectProductDB(), disconnectOrderDB()]);
});

describe("database guarantees", () => {
  test("refuses consumers without the unique index and deploys it idempotently", async () => {
    await Order.collection.dropIndex("orderId_1");
    await expect(verifyOrderIndexes()).rejects.toThrow(
      "idempotency index is missing",
    );
    await Order.createIndexes();
    await Order.createIndexes();
    await expect(verifyOrderIndexes()).resolves.toBeUndefined();
  });

  test("concurrent duplicate payment events persist exactly one order", async () => {
    const orderId = `cs_test_${crypto.randomUUID()}`;
    const order = {
      orderId,
      userId: "user_integration",
      email: "test@example.com",
      amount: 1000,
      status: "success" as const,
      products: [{ name: "Test product", price: 1000, quantity: 1 }],
    };
    try {
      await Promise.all(Array.from({ length: 12 }, () => createOrder(order)));
      expect(await Order.countDocuments({ orderId })).toBe(1);
    } finally {
      await Order.deleteMany({ orderId });
    }
  });

  test("Prisma rolls back all writes when a transaction fails", async () => {
    const slug = `rollback-${crypto.randomUUID()}`;
    await expect(
      db.transaction(async (tx) => {
        await tx.orm.public.Category.create({ name: "Rollback", slug });
        throw new Error("abort transaction");
      }),
    ).rejects.toThrow("abort transaction");
    expect(await db.orm.public.Category.where({ slug }).first()).toBeNull();
  });

  test("competing outbox workers publish a claim only once", async () => {
    const id = crypto.randomUUID();
    const start = spyOn(producer, "start").mockResolvedValue();
    const send = spyOn(producer, "send").mockResolvedValue();
    await db.orm.public.ProductOutboxEvent.create({
      id,
      topic: "product.created",
      eventKey: id,
      payload: {},
      updatedAt: nowUtc(),
      availableAt: nowUtc(),
    });
    try {
      await Promise.all(
        Array.from({ length: 12 }, () => relayProductOutboxOnce()),
      );
      expect(send).toHaveBeenCalledTimes(1);
      const event = await db.orm.public.ProductOutboxEvent.where({
        id,
      }).first();
      expect(event?.status).toBe("PUBLISHED");
      expect(event?.attempts).toBe(1);
    } finally {
      start.mockRestore();
      send.mockRestore();
      await db.orm.public.ProductOutboxEvent.where({ id }).delete();
    }
  });

  test.each(["success", "failure"])(
    "a stale outbox worker cannot overwrite a newer claim after %s",
    async (outcome) => {
      const id = crypto.randomUUID();
      const started = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const start = spyOn(producer, "start").mockResolvedValue();
      const send = spyOn(producer, "send").mockImplementation(async () => {
        started.resolve();
        await release.promise;
        if (outcome === "failure") throw new Error("broker unavailable");
      });
      const current = nowUtc();
      await db.orm.public.ProductOutboxEvent.create({
        id,
        topic: "product.created",
        eventKey: id,
        payload: {},
        updatedAt: current,
        availableAt: current,
      });
      let work: Promise<void> | undefined;
      try {
        work = relayProductOutboxOnce();
        await started.promise;
        // Model a second replica reclaiming the expired lease and finishing.
        await db.orm.public.ProductOutboxEvent.where({ id }).update({
          attempts: 2,
          status: "PUBLISHED",
          leaseUntil: null,
          publishedAt: nowUtc(),
          updatedAt: nowUtc(),
        });
        release.resolve();
        await work;
        const event = await db.orm.public.ProductOutboxEvent.where({
          id,
        }).first();
        expect(event?.status).toBe("PUBLISHED");
        expect(event?.attempts).toBe(2);
        expect(event?.lastError).toBeNull();
      } finally {
        release.resolve();
        await work;
        start.mockRestore();
        send.mockRestore();
        await db.orm.public.ProductOutboxEvent.where({ id }).delete();
      }
    },
  );
});
