import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export const getStripeClient = () => {
  if (!isStripeConfigured()) {
    return null;
  }

  if (stripeClient === undefined) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }

  return stripeClient;
};

export const setStripeClientForTesting = (
  client: Stripe | null | undefined,
) => {
  stripeClient = client;
};

export const getStripeWebhookSecret = () =>
  process.env.STRIPE_WEBHOOK_SECRET || null;
