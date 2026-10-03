# ADR 0001: catalog mutations and transactional outbox

Accepted, October 3, 2026.

A catalog write must not disappear from downstream processing when Kafka is
unavailable. Product create, update and delete commit an outbox row in the same
PostgreSQL transaction. Relays claim with an atomic conditional update and a
lease; only the matching attempt can finalize that claim. Each polling cycle
processes at most 25 available rows and yields before the next cycle.

Publication is at least once. A crash after Kafka acknowledges but before the
outbox is marked published produces another delivery. Consumers must therefore
be idempotent. There is no distributed transaction between PostgreSQL and Kafka.

Separate legacy create/update/delete topics do not provide aggregate ordering.
Payment consumers treat them as synchronization hints, persist the hint, and
read current catalog state under a per-product advisory lock. Old events cannot
restore an old event payload. Stripe lookup keys transfer to replacement prices;
product identity is kept in payment-owned storage. Periodic reconciliation of
payments is independent of this catalog synchronization.

The relay retains published rows. Select a retention period after business and
recovery requirements are agreed; never delete pending rows or use log cleanup
as a substitute for successful delivery. Backfills should be throttled and
monitored. Concurrency and stale-claim tests live in integration-tests.
