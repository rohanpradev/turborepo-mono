import Stripe from "stripe";
import { Topics, type PaymentSuccessfulMessage } from "@repo/kafka";
import {
  recordIntegrationEvent,
} from "../observability/integrationEvents";
import { registerProcessedEvent } from "../observability/processedEvents";
import { producer } from "../utils/kafka";
import { getStripeClient, getStripeWebhookSecret } from "../utils/stripe";

type WebhookResult =
  | { status: "ok" }
  | { status: "not_configured" }
  | { status: "invalid"; message: string };

const successEventTypes = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export const StripeWebhookService = {
  async handleEvent(
    payload: Buffer,
    signature?: string,
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

    let event;

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

    if (!registerProcessedEvent(`stripe:${event.id}`)) {
      recordIntegrationEvent({
        source: "webhook",
        type: "stripe.webhook.duplicate_ignored",
        message: "Ignored duplicate Stripe webhook event.",
        details: {
          eventId: event.id,
          eventType: event.type,
        },
      });
      return { status: "ok" };
    }

    if (!successEventTypes.has(event.type)) {
      return { status: "ok" };
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (!("id" in session) || typeof session.id !== "string") {
      return { status: "ok" };
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ["data.price.product"],
    });

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? session.id;
    const paymentIntent =
      paymentIntentId && paymentIntentId !== session.id
        ? await stripe.paymentIntents.retrieve(paymentIntentId)
        : null;

    const message: PaymentSuccessfulMessage = {
      orderId: session.id,
      userId:
        typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : session.metadata?.userId ?? "unknown",
      email:
        session.customer_details?.email ??
        session.customer_email ??
        "unknown@example.com",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      status: "success",
      paymentMethod:
        paymentIntent?.payment_method_types?.[0] ??
        session.payment_method_types?.[0] ??
        "unknown",
      transactionId: paymentIntentId,
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
            Math.floor((item.amount_total ?? 0) / Math.max(item.quantity ?? 1, 1)),
        };
      }),
      processedAt: new Date().toISOString(),
    };

    await producer.send(Topics.PAYMENT_SUCCESSFUL, message, {
      key: message.orderId,
    });

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

    return { status: "ok" };
  },
};
