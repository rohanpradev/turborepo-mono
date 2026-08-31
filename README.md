# Commerce Platform Monorepo

A production-style ecommerce platform built to showcase modern full-stack engineering: a Bun-first Turborepo, Next.js storefront and admin apps, typed Hono microservices, Clerk authentication, Stripe checkout, Kafka event flow, PostgreSQL, MongoDB, and hardened Docker orchestration.

This is not a single demo app in a big folder. It is a real distributed commerce system with clear service ownership, shared contracts, event-driven integration, CI quality gates, and local workflows that let you run either the whole platform or only the pieces you are actively developing.

## Highlights

- **Turborepo workspace** with strict environment pass-through, task caching, package boundaries, and shared TypeScript config.
- **Customer storefront** in `apps/client` with catalog browsing, search, filters, cart state, checkout, order return flow, SEO metadata, sitemap, and service diagnostics.
- **Admin operations app** in `apps/admin` for product/catalog operations, customer/order visibility, payment events, service health, and Kafka-backed payment activity.
- **Typed Hono microservices** for product, payment, and order domains, all with Zod contracts, OpenAPI metadata, Scalar API docs, structured error payloads, request IDs, CORS, compression, secure headers, timing, and readiness endpoints.
- **Clerk auth everywhere it matters**: Next.js auth UI, service middleware, bearer-token authorization, admin role/session-claim checks, and local `ADMIN_USER_IDS` recovery support.
- **Kafka integration** for catalog sync and payment/order workflows with typed topics, durable topic defaults, instrumentation hooks, and explicit topic creation.
- **Reliable Stripe checkout** with same-origin Clerk-authenticated BFF routes, raw-body webhook verification, asynchronous Kafka handoff, retry-safe order materialization, and a Kubernetes Stripe CLI sidecar for local event forwarding.
- **Traceable service flows** with W3C trace headers, request IDs, structured HTTP telemetry, Kafka message telemetry, and checkout trace propagation across payment and product services.
- **Kubernetes observability** with Prometheus Operator ServiceMonitors, app `/metrics`, Traefik metrics, alert rules, and a Grafana dashboard.
- **Polyglot persistence** with Prisma/PostgreSQL for product catalog writes and a Kafka-fed MongoDB read model for orders.
- **Hardened Docker stack** using Docker Hardened Images, Traefik TLS routing, Kafka UI, health waits, read-only app containers, capability drops, and reproducible image locking support.
- **CI-grade standards**: Biome, Syncpack, Knip, Bun 1.4 isolated parallel tests, lockfile deduplication, Bun audit, production license inventory, type checking, Next builds, Compose validation, Docker image builds, SBOM, and provenance.

## System Map

```mermaid
flowchart LR
  customer["Customer"] --> storefront["Next.js Storefront\napps/client"]
  operator["Operator"] --> admin["Next.js Admin\napps/admin"]

  storefront --> product["Product Service\nHono + Prisma"]
  admin --> product
  storefront --> payment["Payment Service\nHono + Stripe"]
  admin --> payment
  storefront --> order["Order Service\nHono + MongoDB"]
  admin --> order

  product --> postgres["PostgreSQL\nProduct Catalog"]
  order --> mongo["MongoDB\nOrder Read Model"]

  product -- "product.created / updated / deleted" --> kafka["Kafka"]
  kafka --> payment
  payment -- "stripe.checkout.completed / payment.successful" --> kafka
  kafka --> order
  payment --> stripe["Stripe"]

  clerk["Clerk"] --> storefront
  clerk --> admin
  clerk --> product
  clerk --> payment
  clerk --> order
```

For deeper boundary, event, and runtime notes, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
For engineering standards and verification policy, see [docs/QUALITY.md](docs/QUALITY.md).
For service and Kafka telemetry behavior, see [docs/TELEMETRY.md](docs/TELEMETRY.md).
For Prometheus, Grafana, Traefik, and Kubernetes metrics, see [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).
For Stripe deployment, webhook, Clerk-auth, and incident procedures, see [docs/STRIPE_OPERATIONS.md](docs/STRIPE_OPERATIONS.md).
For the current expert gap assessment and prioritized roadmap, see [docs/EXPERT_MICROSERVICES_IMPROVEMENT_PLAN.md](docs/EXPERT_MICROSERVICES_IMPROVEMENT_PLAN.md).

## Apps And Packages

| Workspace | Responsibility |
| --- | --- |
| `apps/client` | Customer storefront, cart, checkout, orders, product pages, diagnostics, SEO routes |
| `apps/admin` | Admin dashboard for catalog, users, payments, service health, and integration events |
| `apps/product-service` | Catalog/category API, Prisma writes, product Kafka event publication |
| `apps/payment-service` | Stripe checkout sessions, webhooks, catalog sync consumer, payment event publication |
| `apps/order-service` | Order API backed by Kafka-fed MongoDB read model |
| `packages/api-client` | Typed service client used by Next.js apps and tests |
| `packages/types` | Shared Zod schemas, API records, auth claims, pricing/cart/order types |
| `packages/hono-utils` | Shared service app factory, auth middleware, OpenAPI helpers, health/runtime utilities |
| `packages/kafka` | Typed Kafka client, producer, consumer, topic admin, instrumentation |
| `packages/product-db` | Prisma schema, generated client, Postgres connection |
| `packages/order-db` | MongoDB models and connection helpers |
| `packages/typescript-config` | Shared TypeScript presets |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Monorepo | Turborepo, Bun workspaces, Bun catalogs |
| Frontend | Next.js 16.3, React 19, Tailwind CSS 4, Radix UI, Lucide |
| APIs | Hono 4.13, Zod, OpenAPI, Scalar API Reference |
| Auth | Clerk for frontend sessions and service bearer auth |
| Payments | Stripe Checkout and webhooks |
| Events | Kafka with typed topics and topic management |
| Data | PostgreSQL + Prisma, MongoDB + Mongoose |
| Quality | Biome, Syncpack, Knip, Bun test/coverage, Bun audit, stable TypeScript 7 with TypeScript 6 tooling compatibility |
| Runtime | Bun 1.4.0, digest-pinned Compose images, Traefik 3.7.12, Docker Hardened Images |
| Platform | Helm 4.2.4, Kubernetes 1.35-1.37, Gateway API 1.5.1 |
| CI/CD | GitHub Actions, Helm lint plus kubeconform schema matrix, Docker Buildx, GHCR images, SBOM, provenance |

## Event Flow

1. Product admins create/update/delete catalog products in `apps/admin`.
2. `product-service` validates payloads with shared Zod schemas, writes through Prisma, and publishes catalog events to Kafka.
3. `payment-service` consumes catalog events and keeps Stripe product/price state aligned.
4. Customers browse and check out through `apps/client`.
5. Authenticated checkout and return-status calls stay same-origin at the storefront, which forwards a short-lived Clerk bearer token to `payment-service`.
6. Stripe webhooks land in `payment-service`, which verifies the raw body and publishes `stripe.checkout.completed` before responding.
7. A payment worker enriches the session through Stripe and publishes `payment.successful`.
8. `order-service` consumes successful payment events and idempotently updates the MongoDB order read model.
9. Storefront and admin apps query typed APIs through `packages/api-client`.

## Prerequisites

- `Bun >= 1.4.0`
- `Node >= 20.19.0`
- Docker with Compose
- `mkcert` for locally trusted `*.localhost` TLS certificates
- `docker login dhi.io` if you want the full Docker Hardened Images path

Start with the guided command list:

```bash
make help
```

Or run the repository doctor for a quick readiness check:

```bash
bun run doctor
```

## Quick Start

### Full Platform With Docker

Use this for the complete showcase: Traefik, TLS local domains, storefront, admin, product/payment/order services, Postgres, MongoDB, Kafka, Kafka UI, and Stripe CLI webhook forwarding.

```bash
make setup
make docker-up-build
```

Main URLs:

| Surface | URL |
| --- | --- |
| Storefront | `https://shop.localhost:8443` |
| Admin | `https://admin.localhost:8443` |
| API gateway | `https://api.localhost:8443` |
| Kafka UI | `https://kafka.localhost:8443` |
| Traefik dashboard | `https://dashboard.localhost:8443/dashboard/` |

Docker Compose binds Traefik to `127.0.0.1:8080` and `127.0.0.1:8443` by default so it can coexist with a local Kubernetes ingress controller on ports 80/443. Bare `https://shop.localhost` is reserved for the Kubernetes/Helm path below.

Useful follow-ups:

```bash
make status
make docker-ps
make docker-logs
make docker-down
```

### Local Kubernetes With Helm

Use this when you want to test Kubernetes locally. It deploys the apps with Helm and Traefik, installs Prometheus and Grafana, and keeps Postgres, MongoDB, and Kafka in Docker for a faster laptop-friendly loop.

```bash
make k8s
```

Main URLs:

| Surface | URL |
| --- | --- |
| Storefront | `https://shop.localhost` |
| Admin | `https://admin.localhost` |
| API gateway | `https://api.localhost` |

`make k8s` keeps the Traefik, Grafana, and Prometheus port-forwards active in the foreground and prints the local URLs. Press `Ctrl-C` to stop the forwards.

Useful follow-ups:

```bash
make k8s-doctor
make k8s-status
make k8s-test
make k8s-clear
```

Use `make k8s-full` when you want the full local stack: it keeps Postgres, MongoDB, and Kafka in Docker, then deploys the five app workloads to Kubernetes.

### Local App Development

Use this when you want apps and services running locally over HTTP while Postgres, MongoDB, and Kafka run in Docker:

```bash
make local-dev
```

This target creates local env files, installs dependencies, starts infrastructure, runs Prisma migrations, seeds catalog data, prints URLs, and starts Turbo dev processes.

Raw equivalent:

```bash
make setup-base
make docker-infra-local
make local-env-file
make local-db-migrate
make local-db-seed
bun --env-file=.runtime/local-dev.env run dev
```

Local URLs:

| Surface | URL |
| --- | --- |
| Storefront | `http://localhost:3002` |
| Admin | `http://localhost:3003` |
| Product API | `http://localhost:3000/products` |
| Order API | `http://localhost:8001/api/orders` |
| Payment API | `http://localhost:8002/api/session` |
| Storefront diagnostics | `http://localhost:3002/diagnostics` |

## Quality Gates

Run the same checks the repo is designed around:

```bash
bun run doctor
bun run deps:outdated
bun run deps:check
bun run deps:dedupe:check
bun run lint
bun run knip
bun run boundaries
bun run test
bun run check-types
bun run build
```

Or run the curated gate:

```bash
bun run ci:verify
```

For the broadest local confidence check, including environment and Compose readiness:

```bash
bun run verify:full
```

What the gates cover:

- dependency freshness and catalog consistency
- duplicate lockfile resolutions and production license inventory
- formatting/lint policy with Biome
- unused exports/dependencies with Knip
- executable package boundary rules with Turborepo
- shared contract and integration unit tests
- TypeScript checks across every package
- production builds through Turborepo
- vulnerability audit at moderate severity or higher

## Clerk Setup

The stack can start without live Clerk keys, but authenticated checkout and admin writes need Clerk configured.

Set these in `.env`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

Admin authorization uses a small session claim. In the Clerk Dashboard, add:

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

Then set the target Clerk user's public metadata:

```json
{
  "role": "admin"
}
```

For local recovery while setting up Clerk, `.env` can include:

```bash
ADMIN_USER_IDS=user_...
```

## Stripe Setup

Checkout and webhook behavior require Stripe keys:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

The Docker workflow can run Stripe CLI webhook forwarding. The payment service records recent checkout, webhook, Kafka, and Stripe events so the admin dashboard can show integration activity without digging through logs.

## Docker And Security Posture

The Docker path uses the digest-pinned official Bun 1.4 image for application builds and runtimes, Docker Hardened Images for Postgres, Kafka, and MongoDB, and the digest-pinned official Traefik image. The Compose stack includes:

- TLS routing through Traefik for local `*.localhost` domains
- `exposedByDefault=false` so only explicitly labelled services are routed
- read-only app containers and dropped Linux capabilities
- health checks and readiness waits
- private service network with minimal published ports
- image freshness checks and optional digest lockfile generation

### Container Topology

| Compose service | Image / Build | Purpose |
| --- | --- | --- |
| `traefik` | `traefik:v3.7.12` | TLS router, API gateway, dashboard |
| `docker-socket-proxy` | `ghcr.io/tecnativa/docker-socket-proxy:v0.4.2` | Restricted Docker API surface for Traefik discovery |
| `postgres` | `dhi.io/postgres:18.4-debian13` | Product catalog database |
| `mongodb` | `dhi.io/mongodb:8.3.7-debian13` | Order read-model database |
| `kafka-broker-1..3` | `dhi.io/kafka:4.3.1-debian13-native` | Three-broker Kafka cluster |
| `kafka-ui` | `ghcr.io/kafbat/kafka-ui:v1.5.0` | Kafka topic, consumer, and message visibility |
| `product-service` | `docker/Dockerfile.product-service` | Catalog API, Prisma writes, product events |
| `payment-service` | `docker/Dockerfile.payment-service` | Stripe checkout, webhooks, payment events |
| `order-service` | `docker/Dockerfile.order-service` | Order API and MongoDB read model |
| `client` | `docker/Dockerfile.client` | Customer storefront |
| `admin` | `docker/Dockerfile.admin` | Admin operations dashboard |
| `stripe-cli` | `stripe/stripe-cli:v1.50.6` | Local webhook forwarding |

The five application Dockerfiles use Turbo pruning, Bun frozen installs, and hardened Bun runtime images. Frontend images build standalone Next.js output, while service images copy only runtime code, generated clients, shared packages, and production dependencies.

Useful Docker commands:

```bash
make docker-test
make docker-build
make docker-up-build
make docker-smoke
make docker-lock-images
make docker-down-volumes
```

Before full Docker workflows, authenticate with Docker Hardened Images:

```bash
docker login dhi.io
make docker-auth
```

## Kubernetes With Helm

Use Helm when you want the Kubernetes ingress controller to own bare local domains such as `https://shop.localhost`, `https://admin.localhost`, and `https://api.localhost`.

```bash
make k8s
make ks8
make kubernetes
make k8s-status
make k8s-traefik-status
make k8s-logs-traefik
make k8s-test
```

`make k8s` is the one-command local Kubernetes setup: it installs or upgrades the pinned platform charts, starts Docker-backed dependencies, builds and tags the app images, validates the Helm chart, syncs TLS and runtime secrets, performs an in-place atomic Helm upgrade, waits for rollout, and smoke-tests verified TLS routes. Existing namespaces and unrelated resources are retained. Use `make k8s-reset-local` only when an explicit ecommerce namespace reset is required. `make ks8` is kept as a friendly alias for the common typo, and `make kubernetes` does the same thing as `make k8s`.

The chart lives in `charts/ecommerce`. It can deploy the five application workloads, ClusterIP services, Traefik-backed Ingress routes for the local cluster, optional Gateway API HTTPRoutes for other clusters, readiness/liveness probes, read-only security contexts, PDBs, optional HPAs, optional network policies, and Helm hook jobs for product database migration and optional seeding. Runtime infrastructure such as Postgres, MongoDB, Kafka, Clerk, and Stripe is intentionally externalized through Kubernetes Secrets and values.

`make k8s-tls-secret` syncs the local mkcert certificate into the target namespace, and `make k8s-runtime-secret` syncs runtime secrets from `.env`. For cluster-native dependencies, set `K8S_DATABASE_URL` and `K8S_MONGO_URL` instead of relying on localhost URLs.

Useful Kubernetes operations:

```bash
make helm-dry-run
make k8s-diff
make k8s-wait
make k8s-smoke
make k8s-traefik-status
make k8s-events
make k8s-logs-traefik
make k8s-logs-client
make k8s-logs-product
make k8s-describe K8S_SERVICE=product-service
make k8s-restart
make k8s-clear
```

## API Documentation

Each Hono service exposes typed OpenAPI metadata and Scalar docs through the service app factory. In local development, use the direct service URLs; in Docker, use `https://api.localhost:8443` routing for public RPC paths. In Kubernetes, Helm routing owns bare `https://api.localhost`.

Core API groups:

- product catalog: `/rpc/product/*`
- checkout: `/rpc/payment/checkout/createSession`
- checkout status: `/rpc/payment/checkout/getSessionStatus`
- orders: `/rpc/order/*`
- Stripe webhooks: `/api/webhooks/stripe`
- health/readiness: `/health`, `/health/ready`

## Repository Standards

- Shared API contracts live in `packages/types`; services and apps consume them instead of duplicating request/response shapes.
- Cross-app service calls go through `packages/api-client`.
- Service apps use `packages/hono-utils` for auth, error shape, request IDs, OpenAPI, CORS, secure headers, compression, timing, and readiness.
- Dependency versions are centralized in the root Bun catalog and enforced by Syncpack.
- Kafka topics and message payloads are typed in `packages/kafka`.
- Product mutations go through `product-service` so validation, database writes, and Kafka publication stay consistent.
- Docker workflows prefer pinned version tags plus optional digest locks for reproducibility.
