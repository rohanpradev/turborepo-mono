import { closePaymentStore, getPaymentStore } from "../storage/payment-store";

const id = process.argv[2];
if (!id) throw new Error("Supply the exact quarantined job ID to redrive.");
try {
  if (!(await getPaymentStore().redrive(id)))
    throw new Error("Job is not quarantined or does not exist.");
  console.info("Quarantined job scheduled for retry.");
} finally {
  await closePaymentStore();
}
