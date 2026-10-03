# Commerce operating guide

See [payment/inventory decisions](adr/0002-payment-inventory.md),
[environment setup](../deploy/environments/README.md), and
[Hono review](HONO_REVIEW-2026-10-03.md).

## Local preparation

Configure `PAYMENT_DATABASE_URL` and `INTERNAL_SERVICE_TOKEN` in addition to the
existing environment. Generate the token with a cryptographic generator and
share it only between product and payment; it must contain at least 32 characters.
Run product `db:deploy`, payment `db:deploy` and order `db:deploy` before starting
services. Compose and Helm now provide those deployment jobs. Do not start a new
worker against an old schema. Admin “Manage stock” sets actual units per variant.
Product pages expose currently available units; checkout remains authoritative.

The storefront is US/USD and requires state and ZIP code. Card checkout reserves
stock for a one-hour provider session. Browser retries preserve attempt identity;
payment confirmation clears only a matching unchanged cart. Adding items while
payment is underway cannot silently erase the additions.

## Observability and escalation

- `/health/live` is process liveness. `/health/ready` reflects current required
  storage/signing-secret health. Kafka/Stripe outages appear as degraded optional
  dependencies so durable webhook intake and order reads can continue.
- Scrape `/metrics`. Alert on payment quarantine, job age over five minutes,
  unresolved expired reservations, Kafka quarantines, HTTP failures and latency.
  Payment gauges represent shared storage; use `max`, not `sum`, across replicas.
- Admin payment/customer totals cover the latest 100 persisted checkouts and,
  where present, 25 orders. They are recent activity, not accounting/lifetime
  revenue. The diagnostic event feed remains an explicitly temporary local log.
- `ecommerce_payment_storage_observed=0` means business gauges are unavailable,
  not an empty queue. Investigate database connectivity and migration state.
- Retain request IDs, W3C trace headers and event coordinates when investigating.
  Avoid copying client secrets, addresses or raw webhook bodies into logs/tickets.
  Trace-header propagation does not imply a deployed trace collector.

## Payment backlog / provider outage

1. Check database readiness and the last successful reconciliation. Inspect
   `payment.job` by kind/state without exporting payloads. Repair Stripe, product
   service credentials, inventory or Kafka availability as indicated.
2. Run `bun run --cwd apps/payment-service reconcile 2026-10-01T00:00:00Z`,
   replacing the date with the earliest affected purchase. This repairs session
   attachments, ingests paid sessions and releases Stripe-confirmed expiry.
3. For quarantined rows, fix the cause, then run
   `bun run --cwd apps/payment-service redrive 'enrich:cs_...'` with the exact ID.
   Publication jobs use `publish:<session ID>`. Record the operator and reason in
   the incident record; the command affects only quarantined jobs.
4. Confirm stock, payment and order convergence. A Stripe payment is not proof
   that an order has already been projected. Never fulfill solely from a browser
   redirect or a temporary diagnostic event.

Unknown session creation holds are intentionally conservative. Search Stripe
metadata using the snapshot checkout ID and reconcile from before its creation.
Do not force-release solely because the local expiry passed. Escalate any case
where provider non-creation cannot be established. Do not delete inbox IDs to
retry a payment or issue automatic refunds as a recovery shortcut.

## Kafka poison messages

The consumer validates schema version and payload, retries transient handler
failures with heartbeats, then publishes the original record plus coordinates to
`<topic>.<groupId>.dead-letter` before advancing. A dead-letter publication failure
prevents the source record from being acknowledged. Configure topic ACLs and
retention before production; alert routing must reach an accountable operator.

Export one quarantine envelope to a protected JSON file. Fix the cause, then run
`bun run --cwd packages/kafka replay /secure/path/record.json` with the intended
broker credentials. The tool validates topic, version and payload, and preserves
the original business identity. It re-publishes once and leaves quarantine intact
for audit. Never replay an entire topic without assessing each business effect.

## Backups, restore and promotion

Configure managed PostgreSQL PITR for product/inventory and payment, MongoDB
backups, and encrypted offsite copies with restricted restore roles. Back up
migration ledgers, durable jobs, stock reservations and authentication/secret
configuration. Keep financial/deduplication records until an agreed retention
policy explicitly covers replay and recovery. Do not truncate pending outboxes.

Restore to isolated new databases, keep workers and fulfillment stopped, apply
compatible code/migration checks, and reconcile Stripe from before the backup
point. Replaying paid sessions against rolled-back inventory can conflict with
stock movements after the backup; reconcile these before reopening sales. Verify
unique order indexes, stock invariants, pending jobs, representative orders and
provider totals. Measure actual RPO/RTO; do not infer them from backup success.

Promote verified immutable images only after CI, staging smoke tests, signed
webhook duplicate/delay tests, a real test-mode purchase, and restore evidence.
Roll back application images only when they remain schema compatible. Database
migrations are forward-only: prefer an additive repair over destructive rollback.
Never publish a release from a dirty working tree without reviewing its diff.

## Reproducible disposable tests

```sh
docker compose -f compose.integration.yml up -d --wait
INTEGRATION_DATABASE_URL=postgresql://postgres:integration-only@127.0.0.1:55432/commerce_test \
INTEGRATION_MONGO_URL=mongodb://127.0.0.1:57017/commerce_test \
INTEGRATION_KAFKA_BROKERS=127.0.0.1:59092 bun run test:integration
bun run test:recovery
DATABASE_URL=postgresql://postgres:integration-only@127.0.0.1:55432/commerce_test \
PAYMENT_DATABASE_URL=postgresql://postgres:integration-only@127.0.0.1:55432/commerce_test \
bun run benchmark:catalog
docker compose -f compose.integration.yml down --volumes
```

These credentials belong only to the disposable loopback test stack. The restore
drill creates uniquely named `_restore_test` databases, verifies marker data, and
removes only its own restores. The benchmark uses 1,000 synthetic products,
100 reads and concurrency five; it excludes HTTP/auth/provider latency. Unit
checks, type checks and standalone web smoke tests remain separate CI gates.
