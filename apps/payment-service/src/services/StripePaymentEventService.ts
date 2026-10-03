import type {
  PaymentSuccessfulMessage,
  StripeCheckoutCompletedMessage,
} from "@repo/kafka";
import type Stripe from "stripe";
import { getStripeClient } from "@/utils/stripe";
import { getPaymentStore } from "../storage/payment-store";
import { commitCheckoutStock } from "./InventoryService";

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
  traceparent?: string,
): Promise<void> => {
  await getPaymentStore().enqueue(message, traceparent);
};

export const StripePaymentEventService = {
  async processCompletedCheckout(
    message: StripeCheckoutCompletedMessage,
  ): Promise<PaymentSuccessfulMessage> {
    const stripe = getStripeClient();
    if (!stripe)
      throw new Error("Stripe is not configured for payment enrichment.");
    const session = await stripe.checkout.sessions.retrieve(message.sessionId, {
      expand: ["payment_intent"],
    });

    if (session.status !== "complete" || session.payment_status !== "paid")
      throw new Error("Checkout is not paid yet.");
    const checkoutId = session.metadata?.checkoutId;
    const stored = checkoutId
      ? await getPaymentStore().checkout(checkoutId)
      : null;
    if (checkoutId && !stored) throw new Error("Purchase snapshot is missing.");
    if (
      stored &&
      (stored.snapshot.userId !== getCheckoutOwner(session) ||
        stored.snapshot.total !== session.amount_total ||
        stored.snapshot.currency !== session.currency)
    )
      throw new Error("Paid checkout does not match the purchase snapshot.");
    if (stored)
      await getPaymentStore().attachSession(stored.snapshot.id, session.id);
    const lineItems = stored
      ? null
      : await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ["data.price.product"],
        });
    if (lineItems?.has_more)
      throw new Error("Legacy purchase exceeds the supported item limit.");
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
      items:
        stored?.snapshot.items ??
        (lineItems?.data ?? []).map((item) => {
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
            selectedSize: product?.metadata?.selectedSize,
            selectedColor: product?.metadata?.selectedColor,
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

    const shipping = session.collected_information?.shipping_details;
    if (shipping?.address && shipping.address.country === "US") {
      payment.deliveryAddress = {
        name: shipping.name ?? "",
        line1: shipping.address.line1 ?? "",
        line2: shipping.address.line2,
        city: shipping.address.city ?? "",
        state: shipping.address.state,
        postalCode: shipping.address.postal_code ?? "",
        country: "US",
      };
    }
    if (stored) {
      if (!payment.deliveryAddress?.postalCode)
        throw new Error("Delivery details are missing.");
      await commitCheckoutStock(stored.snapshot.id);
    }
    return payment;
  },
};
