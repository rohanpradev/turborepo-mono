import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { StripeCheckoutService } from "../apps/payment-service/src/services/StripeCheckoutService";
import { StripePaymentEventService } from "../apps/payment-service/src/services/StripePaymentEventService";
import {
  type CheckoutSnapshot,
  closePaymentStore,
  getPaymentStore,
} from "../apps/payment-service/src/storage/payment-store";
import type { StripeClientForTesting as Stripe } from "../apps/payment-service/src/utils/stripe";
import { setStripeClientForTesting } from "../apps/payment-service/src/utils/stripe";
import { inventoryRoutes } from "../apps/product-service/src/routes/inventoryRoutes";
import {
  closeInventory,
  finishReservation,
  listStock,
  migrateInventory,
  reserveStock,
  setStock,
} from "../packages/product-db/src/inventory";

for (const name of ["DATABASE_URL", "PAYMENT_DATABASE_URL"]) {
  if (
    !process.env[name] ||
    !new URL(process.env[name] as string).pathname.endsWith("_test")
  )
    throw new Error("Only disposable *_test databases are allowed.");
}
const must = <T>(value: T | null | undefined): T => {
  if (value == null) throw new Error("Expected a persisted test record.");
  return value;
};
const store = getPaymentStore();
const prefix = `audit-${crypto.randomUUID()}`;
let productId: number;
beforeAll(async () => {
  await store.migrate();
  await store.migrate();
  await migrateInventory();
  await store.pool.query(
    'INSERT INTO public."Category"(name,slug) VALUES($1,$1)',
    [prefix],
  );
  const result = await store.pool.query(
    'INSERT INTO public."Product"(name,"shortDescription",description,price,sizes,colors,images,"categorySlug","updatedAt") VALUES($1,$1,$1,1000,ARRAY[\'m\'],ARRAY[\'black\'],\'{}\'::jsonb,$1,now()) RETURNING id',
    [prefix],
  );
  productId = result.rows[0].id;
});
afterAll(async () => {
  await store.pool.query("DELETE FROM inventory.stock WHERE product_id=$1", [
    productId,
  ]);
  await store.pool.query(
    "DELETE FROM inventory.stock_audit WHERE product_id=$1",
    [productId],
  );
  await store.pool.query("DELETE FROM inventory.reservation WHERE id LIKE $1", [
    `${prefix}%`,
  ]);
  await store.pool.query('DELETE FROM public."Product" WHERE id=$1', [
    productId,
  ]);
  await store.pool.query('DELETE FROM public."Category" WHERE slug=$1', [
    prefix,
  ]);
  await store.pool.query("DELETE FROM payment.job WHERE id LIKE $1", [
    `%${prefix}%`,
  ]);
  await store.pool.query("DELETE FROM payment.checkout WHERE id LIKE $1", [
    `${prefix}%`,
  ]);
  await store.pool.query("DELETE FROM payment.rate_limit WHERE key LIKE $1", [
    `${prefix}%`,
  ]);
  await Promise.all([closeInventory(), closePaymentStore()]);
});
const items = () => [
  { productId, selectedSize: "m", selectedColor: "black", quantity: 1 },
];
const event = (id: string) => ({
  eventId: id,
  eventType: "checkout.session.completed",
  sessionId: id,
  source: "webhook" as const,
  occurredAt: new Date().toISOString(),
});

test("competing buyers cannot oversell the last unit; commits are idempotent", async () => {
  await setStock(productId, "m", "black", 1, "test-admin");
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) =>
      reserveStock(
        `${prefix}-buyer-${i}`,
        "buyer",
        items(),
        Date.now() + 60000,
      ),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const winner = results.findIndex((r) => r.status === "fulfilled");
  expect((await listStock(productId))[0]).toMatchObject({
    onHand: 1,
    reserved: 1,
  });
  await expect(
    setStock(productId, "m", "black", 0, "test-admin"),
  ).rejects.toThrow();
  await Promise.all(
    Array.from({ length: 8 }, () =>
      finishReservation(`${prefix}-buyer-${winner}`, "committed"),
    ),
  );
  expect((await listStock(productId))[0]).toMatchObject({
    onHand: 0,
    reserved: 0,
  });
});

test("duplicate reservations do not double-hold stock and release is idempotent", async () => {
  await setStock(productId, "m", "black", 4, "test-admin");
  const id = `${prefix}-reserve`;
  await Promise.all(
    Array.from({ length: 8 }, () =>
      reserveStock(id, "buyer", items(), Date.now() + 60000),
    ),
  );
  expect((await listStock(productId))[0]?.reserved).toBe(1);
  await expect(
    reserveStock(id, "other-buyer", items(), Date.now() + 60000),
  ).rejects.toThrow();
  await Promise.all(
    Array.from({ length: 8 }, () => finishReservation(id, "released")),
  );
  expect((await listStock(productId))[0]).toMatchObject({
    onHand: 4,
    reserved: 0,
  });
  await expect(finishReservation(id, "committed")).rejects.toThrow();
});

test("failed multi-item reservations roll back all holds", async () => {
  await expect(
    reserveStock(
      `${prefix}-rollback`,
      "buyer",
      [...items(), { ...must(items()[0]), productId: 2147483647 }],
      Date.now() + 60000,
    ),
  ).rejects.toThrow();
  expect((await listStock(productId))[0]?.reserved).toBe(0);
});

test("duplicate webhook deliveries create one durable job across workers", async () => {
  const id = `${prefix}-duplicate`;
  const writes = await Promise.all(
    Array.from({ length: 12 }, () => store.enqueue(event(id))),
  );
  expect(writes.filter(Boolean)).toHaveLength(1);
  const jobs = await Promise.all(
    Array.from({ length: 12 }, () => store.claim("enrich")),
  );
  const job = must(jobs.find(Boolean));
  expect(jobs.filter(Boolean)).toHaveLength(1);
  await store.complete(job);
  expect(await store.enqueue(event(id))).toBe(false);
});

test("expired leases are reclaimed and stale workers cannot complete", async () => {
  const id = `${prefix}-lease`;
  await store.enqueue(event(id));
  const old = await store.claim("enrich");
  expect(old).not.toBeNull();
  await store.pool.query(
    "UPDATE payment.job SET lease_until=now()-interval '1 second' WHERE id=$1",
    [must(old).id],
  );
  const fresh = await store.claim("enrich");
  expect(must(fresh).token).not.toBe(must(old).token);
  await expect(store.complete(must(old))).rejects.toThrow("lease was lost");
  await store.complete(must(fresh));
});

test("payment persistence and publication commit together and survive duplicate enrichment", async () => {
  const id = `${prefix}-atomic`;
  const snapshot: CheckoutSnapshot = {
    id,
    userId: "buyer",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    currency: "usd",
    total: 1000,
    items: [
      {
        productId: String(productId),
        name: "Test",
        description: "Test",
        price: 1000,
        quantity: 1,
        selectedSize: "m",
        selectedColor: "black",
      },
    ],
  };
  await store.saveCheckout(snapshot, "hash");
  await store.attachSession(id, id);
  await expect(store.saveCheckout(snapshot, "different")).rejects.toThrow();
  await store.enqueue(event(id));
  const job = must(await store.claim("enrich"));
  const payment = {
    orderId: id,
    userId: "buyer",
    email: "buyer@example.com",
    amount: 1000,
    currency: "usd",
    status: "success" as const,
    paymentMethod: "card",
    transactionId: `pi_${id}`,
    items: snapshot.items,
    processedAt: new Date().toISOString(),
  };
  await store.complete(job, payment);
  expect((await store.checkout(id))?.payment?.orderId).toBe(id);
  const outbox = await store.claim("publish");
  expect(outbox?.payload).toMatchObject({ orderId: id });
  await store.complete(must(outbox));
  expect(await store.claim("publish")).toBeNull();
});

test("quarantine requires explicit redrive and durable rate limits work across requests", async () => {
  const id = `${prefix}-redrive`;
  await store.enqueue(event(id));
  const job = must(await store.claim("enrich"));
  job.attempts = 8;
  await store.fail(job, new Error("provider-secret-must-not-persist"));
  expect(await store.claim("enrich")).toBeNull();
  expect(await store.redrive(job.id)).toBe(true);
  await store.complete(must(await store.claim("enrich")));
  const allowed = await Promise.all(
    Array.from({ length: 20 }, () => store.allow(`${prefix}-limit`, 3)),
  );
  expect(allowed.filter(Boolean)).toHaveLength(3);
});

test("checkout retries reuse a durable snapshot, reserve once, and retain variants and delivery on payment", async () => {
  const savedEnv = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN,
    PRODUCT_SERVICE_INTERNAL_URL: process.env.PRODUCT_SERVICE_INTERNAL_URL,
  };
  process.env.STRIPE_SECRET_KEY = "sk_test_integration";
  process.env.INTERNAL_SERVICE_TOKEN =
    "integration-only-token-32-characters-long";
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      url.pathname = url.pathname.replace("/internal/inventory", "");
      return inventoryRoutes.fetch(new Request(url, request));
    },
  });
  process.env.PRODUCT_SERVICE_INTERNAL_URL = `http://127.0.0.1:${server.port}`;
  const attempt = crypto.randomUUID();
  const userId = `${prefix}-checkout-buyer`;
  const id = createHash("sha256").update(`${userId}:${attempt}`).digest("hex");
  const sessionId = `${prefix}-session`;
  const cart = [
    { id: productId, quantity: 2, selectedSize: "m", selectedColor: "black" },
  ];
  const snapshot: CheckoutSnapshot = {
    id,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    currency: "usd",
    total: 2468,
    items: [
      {
        productId: String(productId),
        name: "Snapshot name",
        description: "Original description",
        price: 1234,
        quantity: 2,
        selectedSize: "m",
        selectedColor: "black",
      },
    ],
  };
  let creates = 0;
  const session = {
    id: sessionId,
    client_secret: "secret-test",
    status: "open",
    payment_status: "unpaid",
    amount_total: 2468,
    currency: "usd",
    client_reference_id: userId,
    metadata: { userId, checkoutId: id },
    customer_details: { email: "buyer@example.com" },
    payment_intent: { id: `pi_${prefix}`, payment_method_types: ["card"] },
    collected_information: {
      shipping_details: {
        name: "Buyer",
        address: {
          line1: "123 Main St",
          city: "New York",
          state: "NY",
          postal_code: "10001",
          country: "US",
        },
      },
    },
  };
  const fake = {
    checkout: {
      sessions: {
        create: async (
          params: Parameters<Stripe["checkout"]["sessions"]["create"]>[0],
          options: NonNullable<
            Parameters<Stripe["checkout"]["sessions"]["create"]>[1]
          >,
        ) => {
          creates++;
          expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(1234);
          expect(options.idempotencyKey).toBe(`checkout:${id}`);
          return session;
        },
        retrieve: async () => session,
        listLineItems: async () => {
          throw new Error(
            "Snapshot purchases must not depend on mutable provider line items.",
          );
        },
      },
    },
  };
  setStripeClientForTesting(fake as unknown as Stripe);
  try {
    await setStock(productId, "m", "black", 5, "test-admin");
    await store.saveCheckout(
      snapshot,
      createHash("sha256").update(JSON.stringify(cart)).digest("hex"),
    );
    const input = { userId, payload: { checkoutAttemptId: attempt, cart } };
    expect(
      (await StripeCheckoutService.createCheckoutSession(input))?.sessionId,
    ).toBe(sessionId);
    expect(
      (await StripeCheckoutService.createCheckoutSession(input))?.sessionId,
    ).toBe(sessionId);
    expect(creates).toBe(1);
    expect((await listStock(productId))[0]?.reserved).toBe(2);
    session.status = "complete";
    session.payment_status = "paid";
    const payment = await StripePaymentEventService.processCompletedCheckout(
      event(sessionId),
    );
    expect(payment.items[0]).toMatchObject({
      name: "Snapshot name",
      price: 1234,
      quantity: 2,
      selectedSize: "m",
      selectedColor: "black",
    });
    expect(payment.deliveryAddress).toMatchObject({
      state: "NY",
      postalCode: "10001",
      country: "US",
    });
    await StripePaymentEventService.processCompletedCheckout(event(sessionId));
    expect((await listStock(productId))[0]).toMatchObject({
      onHand: 3,
      reserved: 0,
    });
  } finally {
    await server.stop(true);
    setStripeClientForTesting(undefined);
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await store.pool.query("DELETE FROM payment.checkout WHERE id=$1", [id]);
    await store.pool.query("DELETE FROM inventory.reservation WHERE id=$1", [
      id,
    ]);
    await store.pool.query("DELETE FROM payment.rate_limit WHERE key=$1", [
      `checkout:${userId}`,
    ]);
  }
});

test("catalog reconciliation transfers lookup keys and ignores stale event state", async () => {
  const { StripeCatalogService } = await import(
    "../apps/payment-service/src/services/StripeCatalogService"
  );
  const originalKey = process.env.STRIPE_SECRET_KEY;
  const originalOrigin = process.env.PRODUCT_SERVICE_INTERNAL_URL;
  process.env.STRIPE_SECRET_KEY = "sk_test_catalogfixture";
  let price = 1000;
  let missing = false;
  let unavailable = false;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => {
      if (unavailable)
        return Response.json(
          {
            json: {
              code: "SERVICE_UNAVAILABLE",
              status: 503,
              message: "Unavailable",
            },
          },
          { status: 503 },
        );
      if (missing)
        return Response.json(
          { json: { code: "NOT_FOUND", status: 404, message: "Missing" } },
          { status: 404 },
        );
      return Response.json({
        json: {
          success: true,
          data: {
            id: productId,
            name: "Current product",
            shortDescription: "Current description",
            description: "Description",
            price,
            sizes: ["m"],
            colors: ["black"],
            images: { black: "/test.png" },
            categorySlug: prefix,
            updatedAt: new Date(price * 1000).toISOString(),
          },
        },
      });
    },
  });
  process.env.PRODUCT_SERVICE_INTERNAL_URL = `http://127.0.0.1:${server.port}`;
  const prices: Array<{
    id: string;
    unit_amount: number;
    currency: string;
    product: string;
    active: boolean;
    lookup_key?: string;
  }> = [];
  let productActive = true;
  let productCreates = 0;
  const fake = {
    products: {
      list: async () => ({ data: [], has_more: false }),
      create: async () => {
        productCreates++;
        return { id: `catalog_${productId}` };
      },
      update: async (_id: string, params: { active?: boolean }) => {
        if (params.active !== undefined) productActive = params.active;
      },
    },
    prices: {
      list: async () => ({
        data: prices.filter(
          (row) => row.active && row.lookup_key === `catalog:${productId}:usd`,
        ),
        has_more: false,
      }),
      create: async (params: {
        unit_amount: number;
        product: string;
        lookup_key: string;
        transfer_lookup_key: boolean;
      }) => {
        expect(params.transfer_lookup_key).toBe(true);
        for (const old of prices) old.lookup_key = undefined;
        const created = {
          id: `price_${prices.length}`,
          unit_amount: params.unit_amount,
          currency: "usd",
          product: params.product,
          lookup_key: params.lookup_key,
          active: true,
        };
        prices.push(created);
        return created;
      },
      update: async (id: string, params: { active: boolean }) => {
        const row = prices.find((row) => row.id === id);
        if (row) row.active = params.active;
      },
    },
  };
  setStripeClientForTesting(fake as unknown as Stripe);
  try {
    await StripeCatalogService.reconcileProduct(String(productId));
    price = 1500;
    await StripeCatalogService.reconcileProduct(String(productId));
    await StripeCatalogService.reconcileProduct(String(productId));
    expect(productCreates).toBe(1);
    expect(prices).toHaveLength(2);
    expect(prices[0]?.active).toBe(false);
    expect(prices[1]?.unit_amount).toBe(1500);
    unavailable = true;
    await expect(
      StripeCatalogService.reconcileProduct(String(productId)),
    ).rejects.toThrow();
    expect(productActive).toBe(true);
    unavailable = false;
    missing = true;
    await StripeCatalogService.reconcileProduct(String(productId));
    await StripeCatalogService.reconcileProduct(String(productId)); // a late create hint still reads current absence
    expect(productActive).toBe(false);
    expect(prices.every((row) => !row.active)).toBe(true);
  } finally {
    await server.stop(true);
    setStripeClientForTesting(undefined);
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
    if (originalOrigin === undefined)
      delete process.env.PRODUCT_SERVICE_INTERNAL_URL;
    else process.env.PRODUCT_SERVICE_INTERNAL_URL = originalOrigin;
    await store.pool.query("DELETE FROM payment.catalog WHERE product_id=$1", [
      String(productId),
    ]);
  }
});
