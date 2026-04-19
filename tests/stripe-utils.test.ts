import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeConfigured,
  setStripeClientForTesting,
} from "../apps/payment-service/src/utils/stripe";

const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
const originalStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalStripeWebhookSecretFile = process.env.STRIPE_WEBHOOK_SECRET_FILE;

afterEach(() => {
  setStripeClientForTesting(undefined);

  if (originalStripeSecretKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY;
  } else {
    process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
  }

  if (originalStripeWebhookSecret === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = originalStripeWebhookSecret;
  }

  if (originalStripeWebhookSecretFile === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET_FILE;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET_FILE = originalStripeWebhookSecretFile;
  }
});

describe("payment-service stripe utilities", () => {
  it("treats the env key as the source of Stripe configuration", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeConfigured()).toBe(false);
    expect(getStripeClient()).toBeNull();

    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    const client = getStripeClient();

    expect(isStripeConfigured()).toBe(true);
    expect(client).not.toBeNull();
    expect(getStripeClient()).toBe(client);
  });

  it("prefers STRIPE_WEBHOOK_SECRET over the secret file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "stripe-secret-"));
    const secretFile = join(tempDir, "webhook-secret");

    writeFileSync(secretFile, "whsec_from_file\n");
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_from_env";
    process.env.STRIPE_WEBHOOK_SECRET_FILE = secretFile;

    expect(getStripeWebhookSecret()).toBe("whsec_from_env");

    rmSync(tempDir, { force: true, recursive: true });
  });

  it("falls back to the shared webhook secret file when needed", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "stripe-secret-"));
    const secretFile = join(tempDir, "webhook-secret");

    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET_FILE = secretFile;
    writeFileSync(secretFile, "whsec_from_file\n");

    expect(getStripeWebhookSecret()).toBe("whsec_from_file");

    rmSync(tempDir, { force: true, recursive: true });
  });
});
