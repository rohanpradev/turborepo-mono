# ADR 0001: Transactional product event outbox

- Status: accepted
- Date: 2026-07-12

## Context

Product mutations were committed to PostgreSQL before Kafka publication. A broker outage or process crash in that gap permanently lost the corresponding catalog event, leaving payment catalog state stale.

## Decision

Write each product mutation and a `ProductOutboxEvent` in one Prisma transaction. Every product-service replica runs a lease-based relay that claims pending rows, publishes them with a stable event id, and marks them published. Failed publications return to pending with bounded exponential backoff. Expired leases are reclaimable after a crashed relay.

Delivery is at least once. Consumers must therefore remain idempotent. Published rows are retained for audit initially; retention automation can be added after production volume is measured.

## Consequences

- Database state and publication intent can no longer diverge.
- Kafka downtime does not reject catalog writes; it creates observable outbox backlog instead.
- A crash after Kafka accepts an event but before the database update can publish it again.
- The additive migration is compatible with the previous application version. Rollback consists of deploying the previous service image and leaving the unused table/type in place; schema removal, if ever desired, is a separate migration.

## Operations

Alert on old `PENDING`/`PUBLISHING` rows, increasing attempts, and sustained Kafka dependency failure. During rollback or incident response, do not delete pending rows: the relay will resume them after recovery.
