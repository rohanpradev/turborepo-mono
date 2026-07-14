import { existsSync, readFileSync } from "node:fs";
import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

const stripeSecretKeyPattern = /^(?:sk|rk)_(test|live)_[A-Za-z0-9]+$/;
const stripeWebhookSecretPattern = /^whsec_[A-Za-z0-9]+$/;

const getStripeKeyMode = (value?: string) =>
  value?.trim().match(stripeSecretKeyPattern)?.[1] ?? null;

export const isStripeConfigured = () =>
  getStripeKeyMode(process.env.STRIPE_SECRET_KEY) !== null;

export const getStripeClient = () => {
  if (!isStripeConfigured()) {
    return null;
  }

  if (stripeClient === undefined) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      appInfo: {
        name: "ecommerce-payment-service",
        version: "1.0.0",
      },
      maxNetworkRetries: 2,
    });
  }

  return stripeClient;
};

export const setStripeClientForTesting = (
  client: Stripe | null | undefined,
) => {
  stripeClient = client;
};

export const getStripeWebhookSecret = () => {
  const secretFile = process.env.STRIPE_WEBHOOK_SECRET_FILE?.trim();

  if (secretFile && existsSync(secretFile)) {
    const fileSecret = readFileSync(secretFile, "utf8").trim();

    if (stripeWebhookSecretPattern.test(fileSecret)) {
      return fileSecret;
    }
  }

  const envSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  return envSecret && stripeWebhookSecretPattern.test(envSecret)
    ? envSecret
    : null;
};
