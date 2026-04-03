import type { CheckoutSessionPayload } from "@repo/types";
import { recordIntegrationEvent } from "../observability/integrationEvents";
import { getStripeClient } from "../utils/stripe";
import { StripeCatalogService } from "./StripeCatalogService";

type CreateCheckoutSessionInput = {
  payload: CheckoutSessionPayload;
  userId: string;
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

    const lineItems = await Promise.all(
      input.payload.cart.map(async (item) => {
        const existingPriceId = await StripeCatalogService.getCheckoutPriceId(
          item.id.toString(),
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
            price: item.price,
          },
        });
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
              description: item.shortDescription,
              metadata: {
                sourceProductId: item.id.toString(),
              },
            },
            unit_amount: item.price,
          },
          quantity: item.quantity,
        };
      }),
    );

    const session = await stripe.checkout.sessions.create({
      // Stripe's docs still refer to this flow as custom checkout in some places,
      // but stripe-node v22 exposes the renamed "elements" ui_mode enum.
      ui_mode: "elements",
      mode: "payment",
      line_items: lineItems,
      customer_email: input.payload.shippingInfo.email,
      client_reference_id: input.userId,
      return_url: `${process.env.CLIENT_APP_URL ?? "http://localhost:3002"}/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: input.userId,
        shippingName: input.payload.shippingInfo.name,
        shippingLine1: input.payload.shippingInfo.address.line1,
        shippingCity: input.payload.shippingInfo.address.city,
        shippingCountry: input.payload.shippingInfo.address.country,
      },
    });

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
