import { Topics, validateTopicMessage } from "@repo/kafka";
import { getPaymentStore, type PaymentJob } from "../storage/payment-store";
import { producer } from "../utils/kafka";
import { StripeCatalogService } from "./StripeCatalogService";
import { StripePaymentEventService } from "./StripePaymentEventService";

const processPaymentJob = async (kind: PaymentJob["kind"]) => {
  const store = getPaymentStore();
  const job = await store.claim(kind);
  if (!job) return false;
  let leaseLost = false;
  let renewing = false;
  const timer = setInterval(() => {
    if (renewing) return;
    renewing = true;
    void store
      .renew(job)
      .then((owned) => {
        if (!owned) leaseLost = true;
      })
      .catch(() => {
        leaseLost = true;
      })
      .finally(() => {
        renewing = false;
      });
  }, 20000);
  try {
    if (kind === "enrich") {
      const event = validateTopicMessage(
        Topics.STRIPE_CHECKOUT_COMPLETED,
        job.payload,
      );
      const payment =
        await StripePaymentEventService.processCompletedCheckout(event);
      if (leaseLost) throw new Error("Payment lease lost.");
      await store.complete(job, payment);
    } else if (kind === "publish") {
      const payment = validateTopicMessage(
        Topics.PAYMENT_SUCCESSFUL,
        job.payload,
      );
      await producer.start();
      await producer.send(Topics.PAYMENT_SUCCESSFUL, payment, {
        key: payment.orderId,
        headers: {
          "event-id": job.id,
          "schema-version": "1",
          ...(job.traceparent ? { traceparent: job.traceparent } : {}),
        },
      });
      if (leaseLost) throw new Error("Payment lease lost.");
      await store.complete(job);
    } else {
      const payload = job.payload as { productId?: unknown };
      if (
        typeof payload.productId !== "string" ||
        !/^\d+$/.test(payload.productId)
      )
        throw new Error("Invalid catalog job.");
      await StripeCatalogService.reconcileProduct(payload.productId);
      if (leaseLost) throw new Error("Catalog lease lost.");
      await store.complete(job);
    }
  } catch (error) {
    await store.fail(job, error);
    console.error("Payment job failed", {
      id: job.id,
      kind: job.kind,
      attempt: job.attempts,
      errorType: error instanceof Error ? error.name : "Error",
    });
  } finally {
    clearInterval(timer);
  }
  return true;
};

let stopped = true;
let tasks: Promise<void>[] = [];
const run = async (kind: PaymentJob["kind"]) => {
  while (!stopped) {
    try {
      if (await processPaymentJob(kind)) continue;
    } catch {
      console.error("Payment worker storage is unavailable.");
    }
    await Bun.sleep(1000);
  }
};
export const startPaymentWorkers = () => {
  if (!stopped) return;
  stopped = false;
  tasks = (["enrich", "publish", "catalog"] as const).map(run);
};
export const stopPaymentWorkers = async () => {
  stopped = true;
  await Promise.all(tasks);
};
