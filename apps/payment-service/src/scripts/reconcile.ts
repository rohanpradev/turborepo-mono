import { reconcilePayments } from "../services/ReconciliationService";
import { closePaymentStore } from "../storage/payment-store";

const since = process.argv[2]
  ? Math.floor(Date.parse(process.argv[2]) / 1000)
  : undefined;
if (since !== undefined && !Number.isFinite(since))
  throw new Error("Supply an ISO date for the start of reconciliation.");
try {
  await reconcilePayments(since);
  console.info("Payment reconciliation completed.");
} finally {
  await closePaymentStore();
}
