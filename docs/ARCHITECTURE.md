# Architecture

This repository is organized around service ownership rather than framework convenience. The frontend apps are clients of typed APIs; microservices own their domain data and side effects; shared packages provide contracts and infrastructure primitives.

## Service Boundaries

| Service | Owns | Does not own |
| --- | --- | --- |
| `product-service` | Catalog products, categories, Prisma/PostgreSQL writes, product Kafka events | Checkout, payment state, order read models |
| `payment-service` | Stripe checkout sessions, Stripe webhooks, Stripe catalog sync, payment Kafka events | Product source-of-truth data, order storage |
| `order-service` | Order query API and MongoDB order read model | Direct checkout mutation, Stripe webhook handling |
| `client` | Customer browsing, cart, checkout UX, orders UX | Direct database access |
| `admin` | Operator workflows and service visibility | Bypassing service authorization or validation |

## Contract Strategy

- Shared request/response records live in `packages/types`.
- Business APIs are contract-first oRPC procedures defined in `packages/contracts`.
- Runtime validation uses Zod at service boundaries through the oRPC contract implementation.
- Next.js apps call services through `packages/api-client`, keeping RPC transport, auth headers, typed errors, and service URL construction centralized.
- Hono remains the HTTP runtime for service middleware, health/readiness probes, Stripe webhooks, request IDs, CORS, security headers, timeouts, and operational docs.
- Auth claims use `CustomJwtSessionClaims` from `packages/types` so app and service code agree on admin-role shape.

### oRPC Routing

The shared public API host uses namespaced RPC prefixes so Traefik can route each service unambiguously:

| Prefix | Service |
| --- | --- |
| `/rpc/product/*` | `product-service` |
| `/rpc/order/*` | `order-service` |
| `/rpc/payment/*` | `payment-service` |

The RPC transport is standard HTTP over Fetch and works through the existing Docker/Traefik setup without requiring HTTP/2. Service health routes and Stripe webhooks intentionally remain conventional HTTP endpoints.

## Event Strategy

Kafka is used where another service needs an integration fact but should not synchronously own the write path.

| Topic | Producer | Consumers | Purpose |
| --- | --- | --- | --- |
| `product.created` | `product-service` | `payment-service` | Create or sync Stripe catalog state |
| `product.updated` | `product-service` | `payment-service` | Update Stripe catalog state |
| `product.deleted` | `product-service` | `payment-service` | Disable/remove Stripe catalog state |
| `stripe.checkout.completed` | `payment-service` webhook edge | `payment-service` worker | Acknowledge Stripe quickly, then enrich the paid checkout asynchronously |
| `payment.successful` | `payment-service` | `order-service` | Materialize successful checkout into the order read model |

Topic names and payload types are defined in `packages/kafka`, and services call `ensureTopics` at startup so local environments are self-healing.

## Auth And Authorization

Clerk is used in two layers:

- Next.js apps use Clerk for sign-in, sign-up, profile state, and session-aware UI.
- Hono services use Clerk bearer auth middleware for protected routes.

Admin write access is guarded by `requireAdmin`, which accepts either:

- a Clerk session claim with `role: "admin"`
- a configured `ADMIN_USER_IDS` fallback for local recovery

Public read paths can run without Clerk configured, which keeps local service setup approachable while preserving strict authorization where writes or user-specific data are involved. Storefront user-specific calls go through same-origin Next.js route handlers so Clerk's session cookie is resolved at the web edge; service-to-service calls then carry a short-lived bearer token. `CLERK_AUTHORIZED_PARTIES` constrains accepted `azp` claims, and `CLERK_JWT_KEY` can enable local JWT verification without a Clerk network round trip.

## Data Model Choices

- Product catalog writes use PostgreSQL through Prisma because catalog data is relational, validated, and admin-managed.
- Prisma 8 is the primary database CLI/runtime and emits a versioned PostgreSQL contract during local, CI, and container builds. Existing service queries remain on the explicitly namespaced Prisma 7 compatibility client while the supported incremental cutover is exercised.
- Prisma 7 currently owns the existing migration ledger; Prisma 8 must not take migration ownership until the contract, baseline, database signature, and `db` ref are established together. Pool size, idle timeout, and connection timeout remain explicit so dependency outages fail readiness promptly.
- Orders use MongoDB as a read model fed by payment events, which keeps checkout payment handling decoupled from customer order queries.
- Stripe owns payment execution; local services only persist/query the platform state they need.

## Runtime And Operations

Every Hono service uses the shared app factory from `packages/hono-utils`, giving the stack consistent:

- request IDs
- W3C trace context propagation
- structured HTTP telemetry
- structured errors
- validation error payloads
- CORS policy
- secure headers
- compression
- request timing
- request timeout
- OpenAPI metadata
- Scalar docs
- `/health` and `/ready` endpoints

Liveness only answers whether the process should be restarted. Readiness separately tracks PostgreSQL, MongoDB, Kafka, Stripe API access, and Stripe webhook-secret availability. Dependency outages therefore remove a pod from service without creating a restart storm.

The Stripe webhook edge validates the raw request body, records only a small checkout-completion envelope in Kafka, and returns promptly. A payment worker performs Stripe API enrichment and emits `payment.successful`; the order consumer remains idempotent through its unique order identifier. This is an at-least-once flow, so duplicate and out-of-order Stripe deliveries are expected rather than treated as exceptional.

## Telemetry And Correlation

The runtime uses dependency-light, OpenTelemetry-shaped telemetry:

- inbound HTTP requests preserve a valid `traceparent` header or create one when absent
- responses expose `Traceparent`, `X-Trace-Id`, and `X-Request-Id`
- error payloads include `traceId` and `requestId`
- service-to-service calls through `packages/api-client` preserve request and trace headers
- Kafka producers add a `traceparent` message header when needed
- Kafka send/receive logs include topic, partition, offset, message count, duration, and trace ID

This gives local Docker, Kubernetes, and CI smoke runs enough correlation to debug checkout, payment, and order flows before adding a full OpenTelemetry Collector profile.

The Docker path places Traefik in front of the stack and routes public local domains:

- `https://shop.localhost`
- `https://admin.localhost`
- `https://api.localhost`
- `https://kafka.localhost`
- `https://dashboard.localhost/dashboard/`

## Quality Policy

The repository should stay green under:

```bash
bun run deps:check
bun run db:validate
bun run lint
bun run knip
bun run test
bun run check-types
```

Build verification is handled by:

```bash
bun run build
```

Docker verification is handled by:

```bash
make docker-test
```

Dependency versions should be updated through the root catalog, then locked with `bun install`. If a dependency is shared by more than one workspace, prefer `catalog:` in app/package manifests and keep the actual version in the root `package.json`.
# Architecture

## Reliable catalog events

Product create, update, and delete operations use a transactional outbox. The product row mutation and `ProductOutboxEvent` are committed together in PostgreSQL; an in-process, multi-replica-safe relay publishes pending events to Kafka using leases and retry backoff. Delivery is at least once, so catalog consumers must be idempotent. See [ADR 0001](./adr/0001-transactional-product-outbox.md).
