import { Topics, type ProductCreatedMessage } from "@repo/kafka";
import { recordIntegrationEvent } from "../observability/integrationEvents";
import { getStripeClient } from "../utils/stripe";

const priceLookupKey = (productId: string) => `catalog:${productId}:usd`;

const listProductPrices = async (lookupKey: string) => {
  const stripe = getStripeClient();

  if (!stripe) {
    return [];
  }

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 10,
  });

  return prices.data;
};

const findStripeProductBySourceId = async (sourceProductId: string) => {
  const stripe = getStripeClient();

  if (!stripe) {
    return null;
  }

  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.products.list({
      active: true,
      limit: 100,
      starting_after: startingAfter,
    });
    const product =
      page.data.find(
        (item) => item.metadata?.sourceProductId === sourceProductId,
      ) ?? null;

    if (product || !page.has_more) {
      return product;
    }

    startingAfter = page.data.at(-1)?.id;
  }
};

export const StripeCatalogService = {
  async syncCreatedProduct(message: ProductCreatedMessage): Promise<void> {
    const stripe = getStripeClient();

    if (!stripe) {
      recordIntegrationEvent({
        source: "stripe",
        type: "catalog.sync.skipped",
        message: "Skipped Stripe catalog sync because Stripe is not configured.",
        details: {
          productId: message.id,
        },
      });
      console.warn(
        `${Topics.PRODUCT_CREATED} received but Stripe is not configured.`,
      );
      return;
    }

    const existingProduct = await findStripeProductBySourceId(message.id);
    const activeProduct =
      existingProduct
        ? await stripe.products.update(existingProduct.id, {
            name: message.name,
            description: message.description,
            active: true,
            metadata: {
              sourceProductId: message.id,
              sourceCategorySlug: message.categorySlug ?? "",
            },
          })
        : await stripe.products.create({
            name: message.name,
            description: message.description,
            active: true,
            metadata: {
              sourceProductId: message.id,
              sourceCategorySlug: message.categorySlug ?? "",
            },
          });

    const lookupKey = priceLookupKey(message.id);
    const existingPrices = await listProductPrices(lookupKey);
    const matchingPrice = existingPrices.find(
      (price) => price.unit_amount === message.price,
    );

    if (!matchingPrice) {
      const price = await stripe.prices.create({
        currency: "usd",
        product: activeProduct.id,
        unit_amount: message.price,
        lookup_key: lookupKey,
        metadata: {
          sourceProductId: message.id,
        },
      });

      await stripe.products.update(activeProduct.id, {
        default_price: price.id,
      });
    }

    recordIntegrationEvent({
      source: "stripe",
      type: "catalog.synced",
      message: "Synced catalog product into Stripe.",
      details: {
        productId: message.id,
        stripeProductId: activeProduct.id,
        price: message.price,
      },
    });
  },

  async archiveDeletedProduct(sourceProductId: string): Promise<void> {
    const stripe = getStripeClient();

    if (!stripe) {
      recordIntegrationEvent({
        source: "stripe",
        type: "catalog.archive.skipped",
        message:
          "Skipped Stripe catalog archive because Stripe is not configured.",
        details: {
          productId: sourceProductId,
        },
      });
      console.warn(
        `${Topics.PRODUCT_DELETED} received but Stripe is not configured.`,
      );
      return;
    }

    const lookupKey = priceLookupKey(sourceProductId);
    const prices = await listProductPrices(lookupKey);

    await Promise.all(
      prices.map((price) =>
        stripe.prices.update(price.id, {
          active: false,
        }),
      ),
    );

    const stripeProduct = await findStripeProductBySourceId(sourceProductId);

    if (stripeProduct) {
      await stripe.products.update(stripeProduct.id, {
        active: false,
      });
    }

    recordIntegrationEvent({
      source: "stripe",
      type: "catalog.archived",
      message: "Archived Stripe catalog product.",
      details: {
        productId: sourceProductId,
        stripeProductId: stripeProduct?.id ?? null,
      },
    });
  },

  async getCheckoutPriceId(sourceProductId: string) {
    const prices = await listProductPrices(priceLookupKey(sourceProductId));
    return prices[0]?.id ?? null;
  },
};
