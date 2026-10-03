# ADR 0002: durable payment processing and finite inventory

Accepted, October 3, 2026. Business decision: US/USD, finite stock reservations.

## Ownership and boundaries

Product owns `public` catalog tables and the `inventory` schema in the same
PostgreSQL database. Prisma owns the public catalog migration graph; explicit
SQL migrations own inventory. Payment owns a separate database/schema and role
in production; local development can share a server/database. Order owns MongoDB.
No service reads another service's tables at runtime.

Stock is counted by product, size and color. Missing stock means zero available,
including seeded/existing products. Admins set the actual on-hand count, including
reserved units. Updates below held quantities are rejected and changes record the
actor. Product deletion remains blocked by stock foreign keys; set stock to zero
only after resolving reservations. Variant changes do not rewrite past purchases.

## Purchase lifecycle

1. A user and checkout attempt identify an immutable server-priced snapshot.
   Retrying a different cart under the same attempt is rejected. Refreshes in
   the same browser tab reuse that attempt for one hour.
2. Product reserves the entire cart transactionally. Deterministic variant lock
   order and conditional stock updates prevent overselling. Reserve, commit and
   release are idempotent per purchase and terminal states cannot be reversed.
3. Payment creates a one-hour, card-only Stripe Checkout Session using a stable
   idempotency key and inline snapshot prices. It attaches the provider ID with
   a compare-and-set update. The browser never supplies authoritative prices.
4. A verified webhook is acknowledged only after a unique durable inbox insert.
   Duplicates are accepted and deduplicated by session, across processes/restarts.
5. A leased enrichment job verifies paid status, owner, amount and currency,
   captures delivery, then commits the reservation. A crash in this gap is
   recovered by an idempotent commit on retry. Enrichment completion, payment
   storage, and its publication job commit in one payment database transaction.
6. The publication worker retries Kafka independently. Order's unique order ID
   prevents duplicate records. Stored orders retain original variants, prices,
   delivery, currency and transaction identity; fulfillment is tracked separately.

Workers renew leases and fence completion with a random claim token. Processing
is at least once; retries stop at quarantine after eight failures. An operator
fixes the cause and redrives a named job. No automatic refund is performed.

## Expiry and uncertain outcomes

Every five minutes reconciliation scans recent Stripe sessions and unsettled
stored sessions. Paid sessions enter the inbox; only Stripe-confirmed expiry
releases stock. A provider outage must never be interpreted as non-payment.

A crash between reservation and session attachment can leave an unknown hold.
Recent session listing repairs its ID when found. Older unknown creates remain
held and trigger an alert. Run reconciliation from before the purchase timestamp
and inspect Stripe using checkout metadata; do not force-release on clock expiry.
A manually verified non-created session requires an audited operational decision.
This conservative case is a known operational limitation, not automatic recovery.

## Migration and retention

Payment and inventory SQL migrations run in explicit deployment jobs under
advisory locks and record checksums. Never edit an applied migration: add the
next version and extend the runner. Existing catalog rows acquire no invented
stock. Existing order fields remain backward compatible. Legacy paid sessions
without new snapshot metadata can still be reconstructed from Stripe, but missing
historical variants/delivery cannot be invented.

Financial records, inbox IDs and stock audit history are retained. Rate-limit
buckets older than a day are removed. Define personal-data retention, archival,
refund and fulfillment policies before launch. Quarantine payloads can contain
personal data: restrict Kafka access and use encrypted disks and TLS.
