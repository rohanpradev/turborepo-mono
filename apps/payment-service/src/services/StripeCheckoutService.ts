import { createHash } from "node:crypto";
import { ApiClientError, getProduct } from "@repo/api-client";
import { createORPCException } from "@repo/hono-utils";
import {
  type CheckoutSessionPayload,
  MAX_USD_AMOUNT_CENTS,
  MIN_USD_CHARGE_CENTS,
  type ProductRecord,
} from "@repo/types";
import type Stripe from "stripe";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import { enqueuePaidCheckoutSession } from "@/services/StripePaymentEventService";
import { getStripeClient } from "@/utils/stripe";
import {
  type CheckoutSnapshot,
  getPaymentStore,
} from "../storage/payment-store";
import { reserveCheckoutStock } from "./InventoryService";

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
      throw createORPCException(
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

/** @internal Exported for regression tests. */
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
        throw createORPCException(
          409,
          "Cart contains a product that is no longer available.",
          { productId: item.id },
        );
      }

      if (!product.sizes.includes(item.selectedSize)) {
        throw createORPCException(
          409,
          "Cart contains a size that is no longer available.",
          { productId: item.id, selectedSize: item.selectedSize },
        );
      }

      if (!product.colors.includes(item.selectedColor)) {
        throw createORPCException(
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

    const store = getPaymentStore();
    if (!(await store.allow(`checkout:${input.userId}`, 10)))
      throw createORPCException(
        429,
        "Too many checkout attempts. Please wait a minute.",
      );
    const checkoutId = createHash("sha256")
      .update(`${input.userId}:${input.payload.checkoutAttemptId}`)
      .digest("hex");
    const cartHash = createHash("sha256")
      .update(JSON.stringify(input.payload.cart))
      .digest("hex");
    let record = await store.checkout(checkoutId);
    if (
      record &&
      (record.cart_hash !== cartHash || record.snapshot.userId !== input.userId)
    )
      throw createORPCException(
        409,
        "This checkout attempt belongs to a different cart.",
      );
    if (!record) {
      const catalogItems = await resolveCheckoutCatalog(
        input.payload,
        input.telemetryHeaders,
      );
      const total = getCanonicalCartTotal(catalogItems);
      if (total < MIN_USD_CHARGE_CENTS || total > MAX_USD_AMOUNT_CENTS)
        throw createORPCException(
          409,
          "Cart total is outside the supported payment range.",
        );
      const snapshot: CheckoutSnapshot = {
        id: checkoutId,
        userId: input.userId,
        currency: "usd",
        total,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
        items: catalogItems.map((item) => ({
          productId: String(item.id),
          name: item.product.name,
          description: item.product.shortDescription,
          price: item.product.price,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
        })),
      };
      record = await store.saveCheckout(snapshot, cartHash);
    }
    const snapshot = record.snapshot;
    if (snapshot.expiresAt <= Date.now())
      throw createORPCException(
        409,
        "This checkout expired. Start a new checkout.",
      );
    await reserveCheckoutStock(snapshot);
    const session = record.session_id
      ? await stripe.checkout.sessions.retrieve(record.session_id)
      : await stripe.checkout.sessions.create(
          {
            ui_mode: "elements",
            mode: "payment",
            allowed_payment_method_types: ["card"],
            line_items: snapshot.items.map((item) => ({
              price_data: {
                currency: snapshot.currency,
                unit_amount: item.price,
                product_data: {
                  name: `${item.name} (${item.selectedSize}, ${item.selectedColor})`,
                  description: item.description,
                  metadata: {
                    sourceProductId: item.productId,
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor,
                  },
                },
              },
              quantity: item.quantity,
            })),
            client_reference_id: input.userId,
            phone_number_collection: { enabled: true },
            shipping_address_collection: { allowed_countries: ["US"] },
            expires_at: Math.floor(snapshot.expiresAt / 1000),
            return_url: `${process.env.CLIENT_APP_URL ?? "http://localhost:3002"}/return?session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
              userId: input.userId,
              checkoutId,
              canonicalTotalAmount: String(snapshot.total),
            },
          },
          { idempotencyKey: `checkout:${checkoutId}` },
        );
    await store.attachSession(checkoutId, session.id);
    if (session.status !== "open")
      throw createORPCException(
        409,
        "This checkout has already completed or expired.",
      );
    const canonicalTotal = snapshot.total;

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

    if (!(await getPaymentStore().allow(`status:${userId}`, 60)))
      throw createORPCException(
        429,
        "Too many status requests. Please wait a minute.",
      );

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
