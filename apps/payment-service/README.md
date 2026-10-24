# Payment Service

Stripe-backed checkout and webhook service for the e-commerce platform.

## Features

- Server-priced, immutable Checkout snapshots for the Payment Element
- Idempotent finite-stock reservations before session creation
- oRPC checkout and ops procedures at `/rpc/payment/*`
- Raw-body Stripe signature verification and a durable, deduplicated webhook inbox
- Leased enrichment and publication jobs with independent Kafka retries
- Current-state catalog reconciliation from Kafka change notifications

Stripe webhooks intentionally remain a conventional HTTP endpoint at `/api/webhooks/stripe`.
Invalid webhook bodies and signatures receive a fixed error; diagnostics retain only
an error category, never parser messages that may contain private payload data.
Checkout rejects size or color values longer than Stripe's 500-character metadata
limit before reserving inventory, including values in existing purchase snapshots.

The payment database must be migrated before starting the service. See
[ADR 0002](../../docs/adr/0002-payment-inventory.md) for ownership and failure
semantics, and [Stripe operations](../../docs/STRIPE_OPERATIONS.md) for configuration,
reconciliation, and recovery.

## Development

```bash
bun run dev
bun run check-types
```
