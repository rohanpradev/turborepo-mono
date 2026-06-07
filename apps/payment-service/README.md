# Payment Service

Stripe-backed checkout and webhook service for the e-commerce platform.

## Features

- Custom Checkout Sessions integration for the Payment Element
- oRPC checkout and ops procedures at `/rpc/payment/*`
- Verified Stripe webhook handling
- Kafka publication for successful payments
- Kafka consumption for catalog mirroring into Stripe

Stripe webhooks intentionally remain a conventional HTTP endpoint at `/api/webhooks/stripe`.

## Development

```bash
bun run dev
bun run check-types
```
