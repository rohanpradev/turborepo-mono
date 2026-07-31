import {
  type PaymentSuccessfulMessage,
  type StripeCheckoutCompletedMessage,
  Topics,
} from "@repo/kafka";
import type Stripe from "stripe";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import {
  claimProcessableEvent,
  markEventProcessed,
  releaseProcessableEvent,
} from "@/observability/processedEvents";
import { producer } from "@/utils/kafka";
import { getStripeClient } from "@/utils/stripe";

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

const getCheckoutOwner = (session: Stripe.Checkout.Session) => {
  const ownerIds = [
    session.client_reference_id,
    session.metadata?.userId,
  ].filter((ownerId): ownerId is string => Boolean(ownerId));

  if (ownerIds.length === 0 || new Set(ownerIds).size !== 1) {
    throw new Error(
      `Checkout Session ${session.id} has missing or inconsistent ownership metadata.`,
    );
  }

  return ownerIds[0] as string;
};

export const enqueuePaidCheckoutSession = async (
  message: StripeCheckoutCompletedMessage,
) => {
  const eventKey = `stripe-event:${message.eventId}`;

  if (!claimProcessableEvent(eventKey)) {
    recordIntegrationEvent({
      source: "kafka",
      type: "stripe.checkout.completed.duplicate",
      message: "Skipped duplicate paid Checkout Session event.",
      details: {
        eventId: message.eventId,
        sessionId: message.sessionId,
      },
    });
    return false;
  }

  try {
    await producer.send(Topics.STRIPE_CHECKOUT_COMPLETED, message, {
      headers: {
        "stripe-event-id": message.eventId,
        "stripe-event-type": message.eventType,
        source: message.source,
      },
      key: message.sessionId,
    });

    markEventProcessed(eventKey);
  } catch (error) {
    releaseProcessableEvent(eventKey);
    throw error;
  }

  recordIntegrationEvent({
    source: "kafka",
    type: "stripe.checkout.completed.enqueued",
    message: "Enqueued verified paid Checkout Session for enrichment.",
    details: {
      eventId: message.eventId,
      eventType: message.eventType,
      sessionId: message.sessionId,
      source: message.source,
    },
  });

  return true;
};

export const StripePaymentEventService = {
  async processCompletedCheckout(message: StripeCheckoutCompletedMessage) {
    const sessionKey = `payment-successful:${message.sessionId}`;

    if (!claimProcessableEvent(sessionKey)) {
      recordIntegrationEvent({
        source: "kafka",
        type: "payment.successful.duplicate",
        message: "Skipped duplicate payment publication for Checkout Session.",
        details: {
          eventId: message.eventId,
          sessionId: message.sessionId,
        },
      });
      return false;
    }

    const stripe = getStripeClient();

    if (!stripe) {
      releaseProcessableEvent(sessionKey);
      throw new Error("Stripe is not configured for payment enrichment.");
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(
        message.sessionId,
        {
          expand: ["payment_intent"],
        },
      );

      if (session.status !== "complete" || session.payment_status !== "paid") {
        recordIntegrationEvent({
          source: "stripe",
          type: "stripe.checkout.completed.not_paid",
          message:
            "Skipped Checkout Session because Stripe does not report it paid.",
          details: {
            sessionId: session.id,
            status: session.status,
            paymentStatus: session.payment_status,
          },
        });
        markEventProcessed(sessionKey);
        return false;
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
          expand: ["data.price.product"],
        },
      );
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? await stripe.paymentIntents.retrieve(session.payment_intent)
          : (session.payment_intent ?? null);
      const payment: PaymentSuccessfulMessage = {
        orderId: session.id,
        userId: getCheckoutOwner(session),
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

      await producer.send(Topics.PAYMENT_SUCCESSFUL, payment, {
        headers: {
          "stripe-event-id": message.eventId,
          "stripe-event-type": message.eventType,
          "stripe-session-id": session.id,
        },
        key: payment.orderId,
      });

      markEventProcessed(sessionKey);
      recordIntegrationEvent({
        source: "kafka",
        type: "payment.successful.published",
        message: "Published enriched payment.successful Kafka event.",
        details: {
          orderId: payment.orderId,
          transactionId: payment.transactionId,
          amount: payment.amount,
          itemCount: payment.items.length,
        },
      });
      return true;
    } catch (error) {
      releaseProcessableEvent(sessionKey);
      throw error;
    }
  },
};
