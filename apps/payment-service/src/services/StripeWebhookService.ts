import type Stripe from "stripe";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import {
  claimProcessableEvent,
  markEventProcessed,
  releaseProcessableEvent,
} from "@/observability/processedEvents";
import { enqueuePaidCheckoutSession } from "@/services/StripePaymentEventService";
import { getStripeClient, getStripeWebhookSecret } from "@/utils/stripe";

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
      const message =
        error instanceof Error
          ? error.message
          : "Stripe webhook signature verification failed.";

      recordIntegrationEvent({
        source: "webhook",
        type: "stripe.webhook.invalid",
        message: "Stripe webhook signature verification failed.",
        details: {
          reason: message,
        },
      });

      return {
        status: "invalid",
        message,
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

    const eventKey = `stripe-webhook:${event.id}`;

    if (!claimProcessableEvent(eventKey)) {
      recordIntegrationEvent({
        source: "webhook",
        type: "stripe.webhook.duplicate",
        message: "Skipped duplicate Stripe webhook delivery.",
        details: {
          eventId: event.id,
          eventType: event.type,
          sessionId: session.id,
        },
      });
      return { status: "ok" };
    }

    try {
      await enqueue({
        eventId: event.id,
        eventType: event.type,
        sessionId: session.id,
        source: "webhook",
        occurredAt: new Date(event.created * 1_000).toISOString(),
      });
      markEventProcessed(eventKey);
    } catch (error) {
      releaseProcessableEvent(eventKey);
      throw error;
    }

    return { status: "ok" };
  },
};
