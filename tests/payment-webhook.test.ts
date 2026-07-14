import { afterEach, describe, expect, it } from "bun:test";
import type { StripeCheckoutCompletedMessage } from "@repo/kafka";
import {
  STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES,
  webhookRoutes,
} from "../apps/payment-service/src/routes/webhookRoutes";
import { StripeWebhookService } from "../apps/payment-service/src/services/StripeWebhookService";
import { setStripeClientForTesting } from "../apps/payment-service/src/utils/stripe";

const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalWebhookSecretFile = process.env.STRIPE_WEBHOOK_SECRET_FILE;

const createStripeSignature = async (payload: string, secret: string) => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const hex = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `t=${timestamp},v1=${hex}`;
};

afterEach(() => {
  setStripeClientForTesting(undefined);

  if (originalStripeSecretKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY;
  } else {
    process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
  }

  if (originalWebhookSecret === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
  }

  if (originalWebhookSecretFile === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET_FILE;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET_FILE = originalWebhookSecretFile;
  }
});

describe("payment-service Stripe webhook", () => {
  it("rejects oversized payloads before signature verification", async () => {
    const response = await webhookRoutes.request(
      "http://localhost/api/webhooks/stripe",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": "invalid-signature",
        },
        body: "x".repeat(STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES + 1),
      },
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Stripe webhook payload is too large.",
    });
  });

  it("verifies and enqueues paid Checkout Sessions without Stripe enrichment", async () => {
    const webhookSecret = "whsec_webhooktest123";
    const event = {
      id: "evt_checkout_completed_123",
      object: "event",
      api_version: "2026-03-25.dahlia",
      created: 1_784_042_400,
      data: {
        object: {
          id: "cs_test_completed_123",
          object: "checkout.session",
          payment_status: "paid",
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "checkout.session.completed",
    };
    const rawPayload = JSON.stringify(event);
    const signature = await createStripeSignature(rawPayload, webhookSecret);
    const enqueued: Array<StripeCheckoutCompletedMessage> = [];

    process.env.STRIPE_SECRET_KEY = "sk_test_webhooktest123";
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    delete process.env.STRIPE_WEBHOOK_SECRET_FILE;

    const enqueue = async (message: StripeCheckoutCompletedMessage) => {
      enqueued.push(message);
    };
    const first = await StripeWebhookService.handleEvent(
      Buffer.from(rawPayload),
      signature,
      enqueue,
    );
    const replay = await StripeWebhookService.handleEvent(
      Buffer.from(rawPayload),
      signature,
      enqueue,
    );

    expect(first).toEqual({ status: "ok" });
    expect(replay).toEqual({ status: "ok" });
    expect(enqueued).toHaveLength(2);
    expect(enqueued[0]).toMatchObject({
      eventId: event.id,
      eventType: event.type,
      sessionId: event.data.object.id,
      source: "webhook",
    });
  });

  it("rejects a signature created with a different endpoint secret", async () => {
    const rawPayload = JSON.stringify({
      id: "evt_invalid_secret",
      object: "event",
      created: 1_784_042_400,
      data: { object: {} },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "checkout.session.completed",
    });
    const signature = await createStripeSignature(
      rawPayload,
      "whsec_anotherlistener123",
    );

    process.env.STRIPE_SECRET_KEY = "sk_test_webhooktest123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_expectedlistener123";
    delete process.env.STRIPE_WEBHOOK_SECRET_FILE;

    const result = await StripeWebhookService.handleEvent(
      Buffer.from(rawPayload),
      signature,
      async () => {
        throw new Error("Invalid events must not be enqueued.");
      },
    );

    expect(result.status).toBe("invalid");
  });
});
