import type Stripe from "stripe";
import { recordIntegrationEvent } from "../observability/integrationEvents";
import { getStripeClient, getStripeWebhookSecret } from "../utils/stripe";
import { enqueuePaidCheckoutSession } from "./StripePaymentEventService";

type WebhookResult =
  | { status: "ok" }
  | { status: "not_configured" }
  | { status: "invalid"; message: string };

const successEventTypes = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const shouldEnqueueSuccessfulCheckout = (
  eventType: string,
  paymentStatus: Stripe.Checkout.Session.PaymentStatus,
) => successEventTypes.has(eventType) && paymentStatus === "paid";

export const StripeWebhookService = {
  async handleEvent(
    payload: Buffer,
    signature?: string,
    enqueue: typeof enqueuePaidCheckoutSession = enqueuePaidCheckoutSession,
  ): Promise<WebhookResult> {
    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    if (!stripe || !webhookSecret) {
      return { status: "not_configured" };
    }

    if (!signature) {
      return {
        status: "invalid",
        message: "Missing Stripe-Signature header.",
      };
    }

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      // Provider/parser errors can include the raw payload. Retain only a
      // bounded category in diagnostics and return a fixed public message.
      recordIntegrationEvent({
        source: "webhook",
        type: "stripe.webhook.invalid",
        message: "Stripe webhook signature verification failed.",
        details: {
          reason:
            error instanceof SyntaxError
              ? "invalid_payload"
              : "invalid_signature",
        },
      });

      return {
        status: "invalid",
        message: "Stripe webhook payload or signature is invalid.",
      };
    }

    recordIntegrationEvent({
      source: "webhook",
      type: "stripe.webhook.verified",
      message: "Verified Stripe webhook signature.",
      details: {
        eventId: event.id,
        eventType: event.type,
      },
    });

    if (!successEventTypes.has(event.type)) {
      return { status: "ok" };
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (!session.id || typeof session.id !== "string") {
      return { status: "ok" };
    }

    if (!shouldEnqueueSuccessfulCheckout(event.type, session.payment_status)) {
      recordIntegrationEvent({
        source: "webhook",
        type: "stripe.webhook.payment_pending",
        message:
          "Deferred payment publication until Stripe reports the session as paid.",
        details: {
          eventId: event.id,
          eventType: event.type,
          paymentStatus: session.payment_status,
          sessionId: session.id,
        },
      });
      return { status: "ok" };
    }

    // Only durable acceptance may acknowledge a webhook. Concurrent/replayed
    // deliveries are deduplicated by the payment inbox's unique session key.
    await enqueue({
      eventId: event.id,
      eventType: event.type,
      sessionId: session.id,
      source: "webhook",
      occurredAt: new Date(event.created * 1000).toISOString(),
    });
    return { status: "ok" };
  },
};
