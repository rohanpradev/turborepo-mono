import { ApiClientError, getProduct } from "@repo/api-client";
import { createHttpException } from "@repo/hono-utils";
import { type PaymentSuccessfulMessage, Topics } from "@repo/kafka";
import type { CheckoutSessionPayload, ProductRecord } from "@repo/types";
import type Stripe from "stripe";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import {
  claimProcessableEvent,
  markEventProcessed,
  releaseProcessableEvent,
} from "@/observability/processedEvents";
import { StripeCatalogService } from "@/services/StripeCatalogService";
import { producer } from "@/utils/kafka";
import { getStripeClient } from "@/utils/stripe";

type CreateCheckoutSessionInput = {
  payload: CheckoutSessionPayload;
  userId: string;
};

type CheckoutCatalogItem = CheckoutSessionPayload["cart"][number] & {
  product: ProductRecord;
};

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

const fetchCatalogProduct = async (productId: number) => {
  try {
    const response = await getProduct(getProductServiceUrl(), productId);
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

const resolveCheckoutCatalog = async (
  payload: CheckoutSessionPayload,
): Promise<Array<CheckoutCatalogItem>> =>
  Promise.all(
    payload.cart.map(async (item) => {
      const product = await fetchCatalogProduct(item.id);

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
    }),
  );

const getCanonicalCartTotal = (items: Array<CheckoutCatalogItem>) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

const getProductImageUrls = (product: ProductRecord) =>
  Object.values(product.images).filter((image) => /^https?:\/\//.test(image));

const getPaymentIntentId = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? session.id);

const getPaymentMethod = (
  session: Stripe.Checkout.Session,
  paymentIntent: Stripe.PaymentIntent | null,
) =>
  paymentIntent?.payment_method_types?.[0] ??
  session.payment_method_types?.[0] ??
  "unknown";

const publishSuccessfulPaymentFromSession = async (
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) => {
  if (session.status !== "complete" || session.payment_status !== "paid") {
    return;
  }

  const processedEventKey = `stripe-session:${session.id}:paid`;

  if (!claimProcessableEvent(processedEventKey)) {
    return;
  }

  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ["data.price.product"],
    });
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(session.payment_intent)
        : (session.payment_intent ?? null);
    const message: PaymentSuccessfulMessage = {
      orderId: session.id,
      userId:
        typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : (session.metadata?.userId ?? "unknown"),
      email:
        session.customer_details?.email ??
        session.customer_email ??
        "unknown@example.com",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      status: "success",
      paymentMethod: getPaymentMethod(session, paymentIntent),
      transactionId: getPaymentIntentId(session),
      items: lineItems.data.map((item) => {
        const expandedProduct =
          item.price && typeof item.price.product !== "string"
            ? item.price.product
            : null;
        const product =
          expandedProduct && !("deleted" in expandedProduct)
            ? expandedProduct
            : null;

        return {
          productId:
            item.price?.metadata?.sourceProductId ??
            product?.metadata?.sourceProductId ??
            item.price?.id ??
            item.description ??
            "unknown",
          name: item.description ?? "Unknown item",
          quantity: item.quantity ?? 1,
          price:
            item.price?.unit_amount ??
            Math.floor(
              (item.amount_total ?? 0) / Math.max(item.quantity ?? 1, 1),
            ),
        };
      }),
      processedAt: new Date().toISOString(),
    };

    await producer.send(Topics.PAYMENT_SUCCESSFUL, message, {
      headers: {
        "stripe-session-id": session.id,
        source: "checkout-status",
      },
      key: message.orderId,
    });

    markEventProcessed(processedEventKey);

    recordIntegrationEvent({
      source: "kafka",
      type: "payment.successful.published",
      message: "Published payment.successful Kafka event.",
      details: {
        orderId: message.orderId,
        transactionId: message.transactionId,
        amount: message.amount,
        itemCount: message.items.length,
      },
    });
  } catch (error) {
    releaseProcessableEvent(processedEventKey);
    throw error;
  }
};

const createCheckoutIdempotencyKey = async (
  input: CreateCheckoutSessionInput,
  canonicalTotal: number,
) => {
  const digestInput = JSON.stringify({
    userId: input.userId,
    cart: input.payload.cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
    })),
    shippingInfo: input.payload.shippingInfo,
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

    const catalogItems = await resolveCheckoutCatalog(input.payload);
    const canonicalTotal = getCanonicalCartTotal(catalogItems);

    if (canonicalTotal !== input.payload.totalAmount) {
      throw createHttpException(
        409,
        "Cart prices changed. Please review your cart before checkout.",
        {
          expectedTotalAmount: canonicalTotal,
          submittedTotalAmount: input.payload.totalAmount,
        },
      );
    }

    const lineItems = await Promise.all(
      catalogItems.map(async (item) => {
        const productId = item.product.id.toString();
        const existingPriceId =
          await StripeCatalogService.getCheckoutPriceId(productId);

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
            price: item.price,
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
      }),
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
        totalAmount: input.payload.totalAmount,
      },
    });

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
    };
  },

  async getCheckoutSessionStatus(
    sessionId: string,
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

      await publishSuccessfulPaymentFromSession(stripe, session);

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
