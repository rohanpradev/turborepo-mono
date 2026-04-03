# Flagship Commerce Monorepo

An end-to-end commerce platform built as a Bun-first Turborepo with typed Hono microservices, Next.js 16.2 frontends, Kafka-driven integrations, and Docker Hardened Images for production-style local orchestration.

## Why this repo stands out

- Bun-native runtime across the frontend and backend containers.
- Typed service contracts with Hono OpenAPI and Zod validation.
- Split product, payment, and order services with clear ownership boundaries.
- Prisma + PostgreSQL for the catalog, MongoDB for the order read model, and Kafka for event-driven integration.
- Docker Compose stack hardened with read-only app containers, dropped Linux capabilities, and Traefik routing.

## Stack

- `Next.js 16.2` for the storefront and admin apps
- `Hono` for the microservices and API docs
- `Bun` for package management, task running, and runtime execution
- `Prisma` for the product catalog data layer
- `Turborepo` for workspace orchestration and pruning
- `Zod` for shared runtime-safe contracts
- `Docker Hardened Images` for containerized builds and runtime

## Architecture

- `apps/client`: customer storefront
- `apps/admin`: admin dashboard
- `apps/product-service`: catalog API, Prisma/PostgreSQL, product events
- `apps/payment-service`: Stripe checkout + webhook handling + catalog sync
- `apps/order-service`: Kafka-fed MongoDB read model for orders
- `packages/hono-utils`: shared Hono app factory, auth, docs, health, and error handling
- `packages/types`: shared Zod schemas and TypeScript types
- `packages/product-db`: Prisma schema, generated client, and DB connection
- `packages/order-db`: MongoDB models and connection helpers
- `packages/kafka`: typed Kafka client, producers, consumers, and topic helpers

## Local development

```bash
bun install
bun run dev
```

Quality gates:

```bash
bun run check-types
bun test --preload ./tests/preload.ts
bun run build
```

## Docker

This repo uses Docker Hardened Images. The preferred startup path is:

```bash
make docker-up-build
```

### Stripe CLI webhook forwarding

This repo now includes the Stripe CLI container in the default Docker stack, based on Stripe's official Docker image docs.

1. Set `STRIPE_SECRET_KEY` in `.env`. `STRIPE_API_KEY` is optional and, if omitted, the Stripe CLI container falls back to `STRIPE_SECRET_KEY`.
2. Start the Docker stack. The Stripe CLI starts with it by default:

```bash
make docker-up
```

The Stripe CLI forwards events to `http://payment-service:8002/api/webhooks/stripe` inside the Compose network by default. On startup it captures the `whsec_...` signing secret from Stripe CLI output, writes it into a shared runtime volume, and `payment-service` reads that value automatically for webhook verification. No manual secret copy or service restart is required for the Docker flow.

Local webhook forwarding should bypass Traefik and go straight to HTTP on the payment service. Using `https://api.localhost/api/webhooks/stripe` can fail because Stripe and the Stripe CLI don't trust the local Traefik certificate by default. For host-based local development, use `http://localhost:8002/api/webhooks/stripe`. For the Docker stack, keep the default internal target `http://payment-service:8002/api/webhooks/stripe`.

Override `STRIPE_WEBHOOK_FORWARD_TO`, `STRIPE_DEVICE_NAME`, or `STRIPE_CLI_EVENTS` in `.env` if needed. `STRIPE_WEBHOOK_SECRET` is still supported for non-Docker or manually managed webhook setups.

Main routes:

- `https://shop.localhost`
- `https://admin.localhost`
- `https://api.localhost`
- `https://dashboard.localhost`
- `https://kafka.localhost`

## API docs

Each Hono service exposes:

- `/docs` for Scalar API reference
- `/openapi.json` for the OpenAPI document
- `/health`, `/health/live`, and `/health/ready` for service probes

## Showcase notes

- Product and category mutations are admin-only.
- Error handling follows Hono’s documented exception flow with consistent JSON payloads and request IDs.
- Service images now copy only the pruned runtime workspaces they need instead of the full build tree.
