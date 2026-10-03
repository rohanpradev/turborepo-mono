import { getPaymentStore } from "../storage/payment-store";

let payload = "ecommerce_payment_storage_observed 0\n";
export const paymentMetrics = () => payload;
export const paymentMetricsUnavailable = () => {
  payload = "ecommerce_payment_storage_observed 0\n";
};
export const refreshPaymentMetrics = async () => {
  const store = getPaymentStore();
  const rows = await store.metrics();
  const unknown = await store.pool.query<{ count: string }>(
    "SELECT count(*)::text FROM payment.checkout WHERE payment IS NULL AND NOT reservation_released AND session_id IS NULL AND (snapshot->>'expiresAt')::bigint < extract(epoch FROM now())*1000",
  );
  const lines = [
    "ecommerce_payment_storage_observed 1",
    `ecommerce_payment_unresolved_reservations ${unknown.rows[0]?.count ?? 0}`,
  ];
  for (const kind of ["enrich", "publish", "catalog"])
    for (const state of ["pending", "processing", "quarantined"]) {
      const row = rows.find((row) => row.kind === kind && row.state === state);
      const labels = `kind="${kind}",state="${state}"`;
      lines.push(
        `ecommerce_payment_jobs{${labels}} ${row?.count ?? 0}`,
        `ecommerce_payment_job_oldest_seconds{${labels}} ${Math.max(0, row?.age ?? 0)}`,
      );
    }
  payload = `${lines.join("\n")}\n`;
};
