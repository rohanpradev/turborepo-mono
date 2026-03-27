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

This repo uses Docker Hardened Images, so authenticate first:

```bash
docker login dhi.io
docker compose up --build
```

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
