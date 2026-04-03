import { existsSync, readFileSync } from "node:fs";
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

export const getStripeWebhookSecret = () => {
  const envSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (envSecret) {
    return envSecret;
  }

  const secretFile = process.env.STRIPE_WEBHOOK_SECRET_FILE?.trim();

  if (!secretFile || !existsSync(secretFile)) {
    return null;
  }

  const fileSecret = readFileSync(secretFile, "utf8").trim();

  return fileSecret || null;
};
