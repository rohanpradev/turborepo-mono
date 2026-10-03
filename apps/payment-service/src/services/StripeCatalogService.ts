import { createHash } from "node:crypto";
import { ApiClientError, getProduct } from "@repo/api-client";
import { getPaymentStore } from "../storage/payment-store";
import { getStripeClient } from "../utils/stripe";

export const StripeCatalogService = {
  // Reconcile current catalog truth under one per-product lock. Old create,
  // update and delete events are hints, never commands to restore stale state.
  async reconcileProduct(productId: string) {
    const stripe = getStripeClient();
    if (!stripe)
      throw new Error("Stripe is not configured for catalog synchronization.");
    const origin = process.env.PRODUCT_SERVICE_INTERNAL_URL;
    if (!origin) throw new Error("Product service URL is required.");
    const connection = await getPaymentStore().pool.connect();
    try {
      await connection.query("BEGIN");
      const lock = await connection.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_xact_lock(hashtextextended($1,1)) AS locked",
        [productId],
      );
      if (!lock.rows[0]?.locked)
        throw new Error("Catalog product synchronization is busy.");
      let product: Awaited<ReturnType<typeof getProduct>>["data"] | undefined;
      try {
        product = (await getProduct(origin, Number(productId))).data;
      } catch (error) {
        if (!(error instanceof ApiClientError && error.status === 404))
          throw error;
      }
      const mapping = await connection.query<{ stripe_id: string }>(
        "SELECT stripe_id FROM payment.catalog WHERE product_id=$1",
        [productId],
      );
      let stripeId = mapping.rows[0]?.stripe_id;
      if (!stripeId) {
        // Adopt legacy products once before using the durable mapping.
        let startingAfter: string | undefined;
        for (let pageCount = 0; pageCount < 1000; pageCount++) {
          const page = await stripe.products.list({
            limit: 100,
            starting_after: startingAfter,
          });
          stripeId = page.data.find(
            (item) => item.metadata?.sourceProductId === productId,
          )?.id;
          if (stripeId || !page.has_more) break;
          startingAfter = page.data.at(-1)?.id;
          if (pageCount === 999)
            throw new Error(
              "Legacy catalog mapping requires an explicit backfill.",
            );
        }
      }
      const lookupKey = `catalog:${productId}:usd`;
      const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 100,
      });
      if (!product) {
        for (const price of prices.data)
          await stripe.prices.update(price.id, { active: false });
        if (stripeId) await stripe.products.update(stripeId, { active: false });
      } else {
        if (!stripeId) {
          const created = await stripe.products.create(
            {
              id: `catalog_${productId}`,
              name: product.name,
              metadata: { sourceProductId: productId },
            },
            { idempotencyKey: `catalog-product:${productId}` },
          );
          stripeId = created.id;
        }
        await stripe.products.update(stripeId, {
          name: product.name,
          description: product.shortDescription,
          active: true,
          metadata: {
            sourceProductId: productId,
            sourceCategorySlug: product.categorySlug,
          },
        });
        let price = prices.data.find(
          (item) =>
            item.unit_amount === product.price &&
            item.currency === "usd" &&
            item.product === stripeId,
        );
        if (!price) {
          const revision = createHash("sha256")
            .update(
              JSON.stringify([
                productId,
                product.updatedAt,
                product.price,
                stripeId,
              ]),
            )
            .digest("hex");
          price = await stripe.prices.create(
            {
              currency: "usd",
              product: stripeId,
              unit_amount: product.price,
              lookup_key: lookupKey,
              transfer_lookup_key: true,
              metadata: { sourceProductId: productId },
            },
            { idempotencyKey: `catalog-price:${revision}` },
          );
        }
        await stripe.products.update(stripeId, { default_price: price.id });
        for (const old of prices.data)
          if (old.id !== price.id)
            await stripe.prices.update(old.id, { active: false });
      }
      if (stripeId)
        await connection.query(
          "INSERT INTO payment.catalog(product_id,stripe_id,deleted) VALUES($1,$2,$3) ON CONFLICT(product_id) DO UPDATE SET stripe_id=$2,deleted=$3",
          [productId, stripeId, !product],
        );
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  },
};
