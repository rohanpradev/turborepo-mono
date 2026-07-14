import { ApiClientError, getProduct } from "@repo/api-client";
import { createHttpException } from "@repo/hono-utils";
import {
  type CheckoutSessionPayload,
  MAX_USD_AMOUNT_CENTS,
  MIN_USD_CHARGE_CENTS,
  type ProductRecord,
} from "@repo/types";
import type Stripe from "stripe";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import { StripeCatalogService } from "@/services/StripeCatalogService";
import { enqueuePaidCheckoutSession } from "@/services/StripePaymentEventService";
import { getStripeClient } from "@/utils/stripe";

type CreateCheckoutSessionInput = {
  payload: CheckoutSessionPayload;
  telemetryHeaders?: Record<string, string>;
  userId: string;
};

type CheckoutCatalogItem = CheckoutSessionPayload["cart"][number] & {
  product: ProductRecord;
};

type CatalogProductFetcher = (
  productId: number,
  telemetryHeaders?: Record<string, string>,
) => Promise<ProductRecord | null>;

const CHECKOUT_OUTBOUND_CONCURRENCY = 10;

type CheckoutSessionStatus = {
  sessionId: string;
  status: string;
  paymentStatus: string;
  customerEmail: string | null;
  paymentIntentId: string | null;
};

export type CheckoutSessionStatusResult =
  | { kind: "not_configured" }
  | { kind: "not_found"; message: string }
  | { kind: "ok"; data: CheckoutSessionStatus };

const isStripeResourceMissingError = (
  error: unknown,
): error is {
  statusCode: number;
  code: string;
  message?: string;
} =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  "code" in error &&
  (error as { statusCode?: unknown }).statusCode === 404 &&
  (error as { code?: unknown }).code === "resource_missing";

const getProductServiceUrl = () =>
  process.env.PRODUCT_SERVICE_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL ??
  "http://localhost:3000";

const fetchCatalogProduct = async (
  productId: number,
  telemetryHeaders?: Record<string, string>,
) => {
  try {
    const response = await getProduct(
      getProductServiceUrl(),
      productId,
      telemetryHeaders ? { headers: telemetryHeaders } : undefined,
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    if (error instanceof ApiClientError) {
      throw createHttpException(
        502,
        "Unable to verify the cart against the product catalog.",
        { productServiceStatus: error.status },
      );
    }

    throw error;
  }
};

const mapWithConcurrency = async <TInput, TOutput>(
  items: ReadonlyArray<TInput>,
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
) => {
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        const item = items[index];

        if (item !== undefined) {
          results[index] = await mapper(item, index);
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
};

export const resolveCheckoutCatalog = async (
  payload: CheckoutSessionPayload,
  telemetryHeaders?: Record<string, string>,
  fetchProduct: CatalogProductFetcher = fetchCatalogProduct,
): Promise<Array<CheckoutCatalogItem>> => {
  const productRequests = new Map<number, Promise<ProductRecord | null>>();
  const getProductOnce = (productId: number) => {
    const existingRequest = productRequests.get(productId);

    if (existingRequest) {
      return existingRequest;
    }

    const request = fetchProduct(productId, telemetryHeaders);
    productRequests.set(productId, request);
    return request;
  };

  return mapWithConcurrency(
    payload.cart,
    CHECKOUT_OUTBOUND_CONCURRENCY,
    async (item) => {
      const product = await getProductOnce(item.id);

      if (!product) {
        throw createHttpException(
          409,
          "Cart contains a product that is no longer available.",
          { productId: item.id },
        );
      }

      if (!product.sizes.includes(item.selectedSize)) {
        throw createHttpException(
          409,
          "Cart contains a size that is no longer available.",
          { productId: item.id, selectedSize: item.selectedSize },
        );
      }

      if (!product.colors.includes(item.selectedColor)) {
        throw createHttpException(
          409,
          "Cart contains a color that is no longer available.",
          { productId: item.id, selectedColor: item.selectedColor },
        );
      }

      return { ...item, product };
    },
  );
};

const getCanonicalCartTotal = (items: Array<CheckoutCatalogItem>) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

const getProductImageUrls = (product: ProductRecord) =>
  Object.values(product.images).filter((image) => /^https?:\/\//.test(image));

const isCheckoutSessionOwnedBy = (
  session: Pick<Stripe.Checkout.Session, "client_reference_id" | "metadata">,
  userId: string,
) => {
  const ownerIds = [
    session.client_reference_id,
    session.metadata?.userId,
  ].filter((ownerId): ownerId is string => Boolean(ownerId));

  return ownerIds.length > 0 && ownerIds.every((ownerId) => ownerId === userId);
};

const createCheckoutIdempotencyKey = async (
  input: CreateCheckoutSessionInput,
  canonicalTotal: number,
) => {
  const digestInput = JSON.stringify({
    checkoutAttemptId: input.payload.checkoutAttemptId,
    userId: input.userId,
    cart: input.payload.cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
    })),
    canonicalTotal,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(digestInput),
  );
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `checkout:${hex}`;
};

export const StripeCheckoutService = {
  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    const stripe = getStripeClient();

    if (!stripe) {
      recordIntegrationEvent({
        source: "checkout",
        type: "checkout.create.skipped",
        message:
          "Checkout session creation skipped because Stripe is not configured.",
        details: {
          userId: input.userId,
        },
      });
      return null;
    }

    const catalogItems = await resolveCheckoutCatalog(
      input.payload,
      input.telemetryHeaders,
    );
    const canonicalTotal = getCanonicalCartTotal(catalogItems);

    if (canonicalTotal < MIN_USD_CHARGE_CENTS) {
      throw createHttpException(
        409,
        "Cart total is below the minimum amount accepted for checkout.",
        {
          minimumTotalAmount: MIN_USD_CHARGE_CENTS,
          totalAmount: canonicalTotal,
        },
      );
    }

    if (canonicalTotal > MAX_USD_AMOUNT_CENTS) {
      throw createHttpException(
        409,
        "Cart total exceeds the maximum amount accepted for checkout.",
        {
          maximumTotalAmount: MAX_USD_AMOUNT_CENTS,
          totalAmount: canonicalTotal,
        },
      );
    }

    const lineItems = await mapWithConcurrency(
      catalogItems,
      CHECKOUT_OUTBOUND_CONCURRENCY,
      async (item) => {
        const productId = item.product.id.toString();
        const existingPriceId = await StripeCatalogService.getCheckoutPriceId(
          productId,
          item.product.price,
          "usd",
        );

        if (existingPriceId) {
          recordIntegrationEvent({
            source: "checkout",
            type: "checkout.line_item.catalog_price",
            message: "Using synced Stripe catalog price for checkout item.",
            details: {
              productId: item.id,
              stripePriceId: existingPriceId,
            },
          });
          return {
            price: existingPriceId,
            quantity: item.quantity,
          };
        }

        recordIntegrationEvent({
          source: "checkout",
          type: "checkout.line_item.inline_price",
          message: "Using inline Stripe price data for checkout item.",
          details: {
            productId: item.id,
            price: item.product.price,
          },
        });
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.name,
              description: item.product.shortDescription,
              images: getProductImageUrls(item.product),
              metadata: {
                sourceProductId: productId,
                selectedColor: item.selectedColor,
                selectedSize: item.selectedSize,
              },
            },
            unit_amount: item.product.price,
          },
          quantity: item.quantity,
        };
      },
    );

    const session = await stripe.checkout.sessions.create(
      {
        // Stripe Checkout's customizable on-site flow uses the "elements" UI mode.
        ui_mode: "elements",
        mode: "payment",
        line_items: lineItems,
        client_reference_id: input.userId,
        phone_number_collection: {
          enabled: true,
        },
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
        return_url: `${process.env.CLIENT_APP_URL ?? "http://localhost:3002"}/return?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          userId: input.userId,
          canonicalTotalAmount: canonicalTotal.toString(),
        },
      },
      {
        idempotencyKey: await createCheckoutIdempotencyKey(
          input,
          canonicalTotal,
        ),
      },
    );

    if (!session.client_secret) {
      throw new Error(
        "Stripe did not return a checkout session client secret.",
      );
    }

    recordIntegrationEvent({
      source: "checkout",
      type: "checkout.session.created",
      message: "Created Stripe checkout session.",
      details: {
        sessionId: session.id,
        userId: input.userId,
        itemCount: input.payload.cart.length,
        totalAmount: canonicalTotal,
      },
    });

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
    };
  },

  async getCheckoutSessionStatus(
    sessionId: string,
    userId: string,
  ): Promise<CheckoutSessionStatusResult> {
    const stripe = getStripeClient();

    if (!stripe) {
      recordIntegrationEvent({
        source: "checkout",
        type: "checkout.status.skipped",
        message:
          "Checkout status lookup skipped because Stripe is not configured.",
        details: {
          sessionId,
        },
      });
      return { kind: "not_configured" } as const;
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });

      if (!isCheckoutSessionOwnedBy(session, userId)) {
        recordIntegrationEvent({
          source: "checkout",
          type: "checkout.session.status.owner_mismatch",
          message: "Rejected a Checkout Session status request by a non-owner.",
          details: {
            sessionId,
            userId,
          },
        });

        return {
          kind: "not_found",
          message: "Checkout session not found.",
        } as const;
      }

      const paymentIntent =
        typeof session.payment_intent === "string"
          ? null
          : session.payment_intent;

      const status = {
        sessionId: session.id,
        status: session.status ?? "open",
        paymentStatus: session.payment_status ?? "unpaid",
        customerEmail:
          session.customer_details?.email ?? session.customer_email ?? null,
        paymentIntentId: paymentIntent?.id ?? null,
      };

      recordIntegrationEvent({
        source: "checkout",
        type: "checkout.session.status.loaded",
        message: "Loaded Stripe checkout session status.",
        details: {
          sessionId: status.sessionId,
          status: status.status,
          paymentStatus: status.paymentStatus,
        },
      });

      if (session.status === "complete" && session.payment_status === "paid") {
        try {
          await enqueuePaidCheckoutSession({
            eventId: `status:${session.id}`,
            eventType: "checkout.session.status_verified",
            sessionId: session.id,
            source: "checkout-status",
            occurredAt: new Date().toISOString(),
          });
        } catch (error) {
          recordIntegrationEvent({
            source: "kafka",
            type: "stripe.checkout.completed.fallback_failed",
            message:
              "Paid session status loaded, but fallback enqueue was unavailable.",
            details: {
              sessionId: session.id,
              reason: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      return { kind: "ok", data: status } as const;
    } catch (error) {
      if (isStripeResourceMissingError(error)) {
        recordIntegrationEvent({
          source: "checkout",
          type: "checkout.session.status.missing",
          message: "Stripe checkout session was not found.",
          details: {
            sessionId,
            stripeMessage: error.message ?? null,
          },
        });

        return {
          kind: "not_found",
          message: "Checkout session not found.",
        } as const;
      }

      throw error;
    }
  },
};
