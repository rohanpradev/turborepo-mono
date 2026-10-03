import { getPaymentStore } from "../storage/payment-store";
import { getStripeClient } from "../utils/stripe";
import { releaseCheckoutStock } from "./InventoryService";

// A provider outage never releases inventory. Paid sessions always enter the
// durable inbox; only authoritative expired sessions release their reservation.
export const reconcilePayments = async (
  sinceSeconds = Math.floor(Date.now() / 1000) - 86400,
) => {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured.");
  const store = getPaymentStore();
  let cursor: string | undefined;
  for (;;) {
    const page = await stripe.checkout.sessions.list({
      created: { gte: sinceSeconds },
      limit: 100,
      starting_after: cursor,
    });
    for (const session of page.data) {
      if (!session.metadata?.userId) continue;
      const checkoutId = session.metadata.checkoutId;
      if (checkoutId) {
        const record = await store.checkout(checkoutId);
        if (!record) continue;
        await store.attachSession(checkoutId, session.id);
      }
      if (session.payment_status === "paid")
        await store.enqueue({
          eventId: `reconcile:${session.id}`,
          eventType: "checkout.session.reconciled",
          sessionId: session.id,
          source: "reconciliation",
          occurredAt: new Date().toISOString(),
        });
      else if (checkoutId && session.status === "expired") {
        await releaseCheckoutStock(checkoutId);
        await store.markReleased(checkoutId);
      }
    }
    if (!page.has_more) break;
    cursor = page.data.at(-1)?.id;
    if (!cursor)
      throw new Error("Stripe reconciliation pagination did not advance.");
  }
  // Include sessions older than the normal overlap window. Never infer expiry
  // merely from our clock if a Stripe session exists.
  let after = "";
  for (;;) {
    const page = await store.unsettled(after);
    for (const record of page) {
      if (record.snapshot.expiresAt > Date.now()) continue;
      if (!record.session_id) {
        // An uncertain create can have succeeded before attachSession. The
        // Stripe list above repairs recent IDs; unresolved old creates require
        // operator reconciliation rather than risking an oversell.
        continue;
      }
      const session = await stripe.checkout.sessions.retrieve(
        record.session_id,
      );
      if (session.payment_status === "paid")
        await store.enqueue({
          eventId: `reconcile:${session.id}`,
          eventType: "checkout.session.reconciled",
          sessionId: session.id,
          source: "reconciliation",
          occurredAt: new Date().toISOString(),
        });
      else if (session.status === "expired") {
        await releaseCheckoutStock(record.id);
        await store.markReleased(record.id);
      }
    }
    if (page.length < 100) break;
    after = page.at(-1)?.id ?? after;
  }
  await store.cleanup();
};
