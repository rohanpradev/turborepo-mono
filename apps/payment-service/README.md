# Payment Service

Stripe-backed checkout and webhook service for the e-commerce platform.

## Features

- Custom Checkout Sessions integration for the Payment Element
- Verified Stripe webhook handling
- Kafka publication for successful payments
- Kafka consumption for catalog mirroring into Stripe

## Development

```bash
bun run dev
bun run check-types
```
