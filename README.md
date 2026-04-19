#  ECommerce Monorepo

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

## Prerequisites

- `Bun >= 1.3.11`
- `Node >= 20.9.0`
- `Docker` with Compose
- `mkcert` for locally trusted `*.localhost` certificates
- `docker login dhi.io` for Docker Hardened Images

Start by listing the supported workflows:

```bash
make help
```

## Startup commands

### Recommended full Docker stack

Use this when you want the full production-style local setup with Traefik, both Next.js apps, all services, databases, Kafka, and Stripe CLI webhook forwarding:

```bash
make setup
make docker-up-build
```

Useful follow-up commands:

```bash
make status
make docker-ps
make docker-logs
make docker-down
```

### Recommended local app development

Use this when you want the apps and services running locally over HTTP, while Postgres, MongoDB, and Kafka run in Docker:

```bash
make local-dev
```

This target will:

- create `.env` if needed
- install dependencies
- generate Prisma client
- start Docker infra for Postgres, MongoDB, and Kafka
- create a merged local env file
- run Prisma migrations
- seed the product catalog
- print the local URLs
- start the Turbo dev processes

If you want the raw commands instead of the curated target:

```bash
make setup-base
make docker-infra-local
make local-env-file
make local-db-migrate
make local-db-seed
bun --env-file=/tmp/ecommerce-local-dev.env run dev
```

### Direct Bun/Turbo workflow

This works if your infra and env are already prepared:

```bash
bun install
bun run dev
```

## Quality gates

```bash
make lint
make type-check
make test
make build
make verify
```

## Docker

This repo uses Docker Hardened Images. The preferred startup path is:

```bash
make docker-up-build
```

The Docker-related targets you will actually use most often are:

```bash
make docker-build
make docker-up
make docker-up-build
make docker-down
make docker-down-volumes
make docker-logs
make docker-logs-stripe
make docker-rebuild-service SERVICE=product-service
```

The first Docker start runs `mkcert` to generate a locally trusted Traefik certificate for `*.localhost`. If you ever rotate or delete the certs, rerun:

```bash
make docker-certs
```

If you only need the infra for local app development:

```bash
make docker-infra-local
```

The Docker builds use Turborepo pruning plus Docker ignore files to keep build
contexts and dependency installation layers as small and cache-friendly as
possible. The Dockerfiles now use BuildKit cache mounts for Bun installs and
`COPY --link` so repeat builds can reuse dependency and cross-stage copy layers
more aggressively.

The Kafka stack now uses explicit topic creation, broker health checks before
dependent services start, and persistent broker volumes in the Docker Compose
cluster.

The Next.js apps expose lightweight `/api/health` endpoints for container health
checks, so Docker probes don't have to render full pages or depend on auth/data
fetching behavior.

### Stripe CLI webhook forwarding

This repo now includes the Stripe CLI container in the default Docker stack, based on Stripe's official Docker image docs.

1. Set `STRIPE_SECRET_KEY` in `.env`. `STRIPE_API_KEY` is optional and, if omitted, the Stripe CLI container falls back to `STRIPE_SECRET_KEY`.
2. Start the Docker stack. The Stripe CLI starts with it by default:

```bash
make docker-up-build
```

The Stripe CLI forwards events to `http://payment-service:8002/api/webhooks/stripe` inside the Compose network by default. On startup it captures the `whsec_...` signing secret from Stripe CLI output, writes it into a shared runtime volume, and `payment-service` reads that value automatically for webhook verification. No manual secret copy or service restart is required for the Docker flow.

That shared volume is intentional. Docker named volumes are the portable way to share runtime-generated files between containers in Compose. A tmpfs mount would avoid persistence but can't be shared across services, and a bind mount would only add host filesystem coupling when the host doesn't need to read the secret.

Local webhook forwarding should bypass Traefik and go straight to HTTP on the payment service. Using `https://api.localhost/api/webhooks/stripe` can fail because Stripe and the Stripe CLI don't trust the local Traefik certificate by default. For host-based local development, use `http://localhost:8002/api/webhooks/stripe`. For the Docker stack, keep the default internal target `http://payment-service:8002/api/webhooks/stripe`.

Override `STRIPE_WEBHOOK_FORWARD_TO` or `STRIPE_CLI_EVENTS` in `.env` if needed. The Stripe CLI image is pinned to a published version for reproducible Docker builds, and the container reports healthy only after it has written the active webhook signing secret into the shared runtime volume. `STRIPE_WEBHOOK_SECRET` is still supported for non-Docker or manually managed webhook setups.

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

## Kafka notes

- Local broker endpoints: `localhost:9094`, `localhost:9095`, `localhost:9096`
- Internal Docker broker endpoints: `kafka-broker-1:9092`, `kafka-broker-2:9092`, `kafka-broker-3:9092`
- Default event topic settings: `3` partitions, replication factor `3`, `min.insync.replicas=2`

## Showcase notes

- Product and category mutations are admin-only.
- Error handling follows Hono’s documented exception flow with consistent JSON payloads and request IDs.
- Service images now copy only the pruned runtime workspaces they need instead of the full build tree.
