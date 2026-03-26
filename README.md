# E-Commerce Microservices Platform

A Turborepo monorepo for an event-driven e-commerce platform built with Bun, Hono, Next.js, Kafka, PostgreSQL, MongoDB, Clerk, and Stripe.

The repo is structured around typed service contracts:

- Hono services expose OpenAPI and Scalar docs from the same route definitions.
- The shared `@repo/api-client` package consumes those contracts through the Hono RPC client.
- Kafka drives the cross-service flows for catalog sync and order creation.
- The admin payments/users UI remains intentionally unwired until the end-to-end flow is finalized.

## Applications

- `apps/client`: Next.js 16 storefront
- `apps/admin`: Next.js 16 admin dashboard
- `apps/product-service`: Hono API backed by PostgreSQL and Prisma
- `apps/order-service`: Hono API backed by MongoDB read models
- `apps/payment-service`: Hono API for Stripe checkout and webhooks

## Shared Packages

- `@repo/api-client`: Typed Hono RPC client helpers
- `@repo/hono-utils`: Shared OpenAPIHono, validation, and Scalar setup
- `@repo/kafka`: Shared Kafka producer/consumer helpers
- `@repo/order-db`: Mongoose connection and order models
- `@repo/product-db`: Prisma schema, config, and generated client
- `@repo/types`: Shared domain and contract types
- `@repo/typescript-config`: Shared TypeScript config

## Architecture

### Core flows

- Product creation or deletion publishes Kafka events from `product-service`.
- `payment-service` consumes product events and mirrors catalog data into Stripe.
- Successful Stripe payment webhooks publish `payment.successful`.
- `order-service` consumes `payment.successful` and creates the order read model in MongoDB.

### Public routes

- Storefront: `https://shop.localhost`
- Admin: `https://admin.localhost`
- Product API: `https://api.localhost/products`
- Category API: `https://api.localhost/categories`
- Order API: `https://api.localhost/api/orders`
- Payment API: `https://api.localhost/api/session`
- Kafka UI: `https://kafka.localhost`
- Traefik dashboard: `https://dashboard.localhost/dashboard/`

## API Documentation

Each Hono service publishes both:

- Scalar docs at `/docs`
- OpenAPI JSON at `/openapi.json`

Local endpoints:

- Product service: `http://localhost:3000/docs`
- Order service: `http://localhost:8001/docs`
- Payment service: `http://localhost:8002/docs`

## Tech Stack

- Runtime: Bun 1.3.x
- Frontend: Next.js 16, React 19
- APIs: Hono 4 with OpenAPI route contracts
- Data: PostgreSQL 18, MongoDB 8
- Messaging: Apache Kafka 4 in KRaft mode
- Auth: Clerk
- Payments: Stripe
- Monorepo orchestration: Turborepo
- Linting and formatting: Biome

## Prerequisites

- Bun 1.3.11 or newer
- Node.js 20.9 or newer
- Docker with Compose v2
- Clerk account
- Stripe account

## Environment

Copy `.env.example` to `.env` at the repo root and set the values you actually use.

Important variables:

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
TRAEFIK_BASIC_AUTH_USERS=admin:generated_htpasswd_hash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/product_db?schema=public
MONGO_URL=mongodb://admin:admin123@localhost:27017/order_db?authSource=admin
KAFKA_BROKERS=localhost:9094,localhost:9095,localhost:9096
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://api.localhost
NEXT_PUBLIC_ORDER_SERVICE_URL=https://api.localhost
NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://api.localhost
```

## Local Development

Install dependencies:

```bash
bun install
```

Generate the Prisma client:

```bash
cd packages/product-db
bun run db:generate
```

Start all apps in development mode:

```bash
bun run dev
```

Useful filtered commands:

```bash
bunx turbo run dev --filter=client
bunx turbo run dev --filter=admin
bunx turbo run dev --filter=product-service
bunx turbo run dev --filter=order-service
bunx turbo run dev --filter=payment-service
```

## Docker Stack

The root `compose.yml` uses Docker Hardened Images where that is safe and straightforward:

- DHI Bun and Node for app images
- DHI Traefik, Postgres, and Kafka for infrastructure
- Official MongoDB is still pinned separately because the DHI Mongo auth bootstrap path is materially different and should not be swapped in blindly
- Build Dockerfiles now live under `docker/` so the repo root stays focused on the application and Compose entrypoint
- Each Dockerfile now has a colocated Dockerfile-specific ignore file in `docker/`, matching Docker's current build-context guidance

Authenticate once before the first pull:

```bash
docker login dhi.io
```

Set `TRAEFIK_BASIC_AUTH_USERS` to a valid `htpasswd` entry before bringing the stack up. For example:

```bash
htpasswd -nbB admin "change-me"
```

Build and start the full stack:

```bash
docker compose up -d --build
```

Or use the Makefile:

```bash
make docker-up-build
```

Notes:

- Traefik listens on hardened high ports inside the container and is mapped to host `80/443`.
- Traefik's internal admin entrypoint is not published to the host; reach the dashboard only through `https://dashboard.localhost/dashboard/`.
- Kafka UI is exposed only through Traefik and shares the same basic-auth middleware as the dashboard.
- Traefik uses its default local self-signed certificate unless you wire in a local certificate resolver or custom cert bundle.
- Next.js public env values are passed as Docker build args so client bundles receive the correct API and Clerk/Stripe keys.
- Runtime containers are intentionally minimal and shell-less. Prefer `docker debug <container>` over `docker exec ... sh`.
- The GitHub Actions container workflow also needs `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets so it can authenticate to `dhi.io` (`DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` still work as legacy fallback names).

## Kafka Topics

- `product.created`: published by `product-service`, consumed by `payment-service`
- `product.deleted`: published by `product-service`, consumed by `payment-service`
- `payment.successful`: published by `payment-service`, consumed by `order-service`

## Quality Gates

```bash
bun run lint
bun run check-types
bun run audit
bun run test
bun run build
```

Equivalent Make targets:

```bash
make lint
make type-check
make audit
make test
make build
make verify
```

The current automated suite is contract-focused rather than end-to-end:

- Bun contract and smoke tests validate each Hono service root route, `/health`, `/docs`, `/openapi.json`, shared validation payloads, default/override CORS behavior, auth fallback behavior, and typed `@repo/api-client` error handling.
- Bun security audit runs at a `moderate` threshold to catch vulnerable transitive dependencies before merge.
- CI validates Compose rendering, lint, typecheck, tests, and build on every pull request.
- The admin payments/users UI remains intentionally unwired end-to-end and is not represented as a completed E2E flow yet.

## Project Structure

```text
ecommerce/
|- apps/
|  |- admin/
|  |- client/
|  |- order-service/
|  |- payment-service/
|  `- product-service/
|- packages/
|  |- api-client/
|  |- hono-utils/
|  |- kafka/
|  |- order-db/
|  |- product-db/
|  |- types/
|  `- typescript-config/
|- compose.yml
|- docker/
|  |- Dockerfile.admin
|  |- Dockerfile.client
|  |- Dockerfile.order-service
|  |- Dockerfile.payment-service
|  `- Dockerfile.product-service
|- turbo.json
`- package.json
```

## Deployment Notes

- Frontend images are environment-sensitive because `NEXT_PUBLIC_*` values are compiled into the client bundle.
- Backend services can be deployed independently.
- Payment webhooks must be configured against the deployed `payment-service` webhook endpoint.
- The Kafka-driven order creation behavior is part of the intended product behavior and should be preserved during future refactors.

## Contributing

1. Create a feature branch from `main`.
2. Keep service contracts aligned with Hono route definitions, not handwritten interface copies.
3. Run `bun run lint`, `bun run check-types`, and `bun run build`.
4. Validate Docker changes against the hardened stack before merging.
5. Open a pull request with any behavior changes called out explicitly.

## License

MIT
