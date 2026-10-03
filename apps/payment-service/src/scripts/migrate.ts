import { closePaymentStore, getPaymentStore } from "../storage/payment-store";

try {
  await getPaymentStore().migrate();
} finally {
  await closePaymentStore();
}
