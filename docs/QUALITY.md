# Quality Standards

This project is intended to read and behave like a production-grade ecommerce platform, even when it is run locally as a showcase. The standards below are the guardrails for keeping it that way.

## Engineering Principles

- Keep service ownership clear. Product, payment, and order code should not bypass each other through shared database access.
- Keep runtime contracts shared. Request, response, event, auth, cart, and order types belong in `packages/types` or `packages/kafka`, not copied into individual apps.
- Keep service clients centralized. Frontend apps should call backend services through `packages/api-client`.
- Prefer runtime validation at boundaries. Public service inputs should be parsed with Zod schemas that also power OpenAPI docs.
- Preserve operational visibility. New services and meaningful dependencies should expose health/readiness state through the shared Hono runtime helpers.
- Preserve request and event correlation. HTTP handlers should keep `X-Request-Id` and W3C `traceparent` flowing, and Kafka producers should preserve or create trace headers.
- Make local development honest. If a workflow needs Kafka, Postgres, MongoDB, Clerk, Stripe, or DHI credentials, document and check that explicitly.

## Verification Ladder

Use the smallest check that matches the risk of the change.

| Change type | Minimum verification |
| --- | --- |
| Documentation only | `bun run lint` |
| Package/catalog changes | `bun run deps:check`, `bun run deps:dedupe:check`, `bun run lint`, `bun run test` |
| Shared types or API client | `bun run test`, `bun run check-types` |
| Frontend routes/components | `bun run lint`, `bun run check-types`, `bun run build` |
| Hono services | `bun run test`, `bun run check-types`, `bun run build` |
| Kafka contracts | `bun run test`, `bun run check-types`, `make docker-validate` |
| Package boundary changes | `bun run boundaries`, `bun run check-types` |
| Telemetry changes | `bun run test`, `bun run check-types`, inspect service logs for `traceId` |
| Docker/Compose changes | `bun run doctor`, `make docker-validate`, `make docker-test` when DHI credentials are available |
| Helm/Kubernetes changes | `make helm-lint`, `make helm-template`, `kubectl apply --dry-run=client --validate=false -f <rendered-manifests>` |

## Main Commands

```bash
bun run doctor
bun run deps:check
bun run deps:dedupe:check
bun run lint
bun run knip
bun run boundaries
bun run test
bun run check-types
bun run build
bun run turbo:inspect
make docker-validate
make helm-lint
```

Use the full local gate when you want a strong pre-PR signal:

```bash
bun run verify:full
```

Use the full Docker gate when Docker Hardened Images credentials are configured:

```bash
docker login dhi.io
make docker-test
```

## Dependency Policy

- Root `package.json` owns shared dependency versions through the Bun catalog.
- Workspace manifests should use `catalog:` for repeated dependencies.
- `syncpack lint` is the authority for catalog drift.
- Run `bun outdated --recursive` before dependency refreshes.
- Run `bun install` after package or catalog edits so `bun.lock` stays authoritative.
- Run `bun dedupe` after dependency refreshes; CI enforces `bun dedupe --check`.
- Use `bun run test:changed` for a focused local loop and the parallel isolated suite for full verification.
- Review `bun run deps:licenses` when introducing production dependencies; CI publishes the JSON inventory.
- CI and Dockerfile tool versions should stay aligned with root tool versions.

## Monorepo Governance

- `bun run boundaries` is the executable ownership check. It prevents frontend apps from importing service runtime, Kafka, or data packages, and keeps product/order data packages owned by their services.
- Package tags live in package-local `turbo.json` files so ownership is visible where code lives.
- `bun run turbo:inspect` generates a Turbo run summary, task graph, and `docs/turbo-report.md` for cache and task-selection review.
- CI uploads `.turbo/runs/*.json`, `docs/task-graph.mermaid`, and `docs/turbo-report.md` as short-lived diagnostics artifacts.
- Remote cache artifact signing is enabled. CI should set `TURBO_TEAM`, `TURBO_TOKEN`, and a 32-byte-or-longer `TURBO_REMOTE_CACHE_SIGNATURE_KEY`.

## Telemetry Policy

- Services emit structured JSON telemetry by default; set `TELEMETRY_ENABLED=false` only for focused local debugging.
- Do not log secrets, bearer tokens, raw Stripe webhook secrets, card data, or full request bodies.
- Prefer low-cardinality fields: method, route/path, status, service, topic, partition, offset, and dependency name.
- Preserve incoming `traceparent` where possible; create one at the edge when absent.
- Keep service-to-service calls on `packages/api-client` so trace/request headers can be propagated centrally.
- Use Prometheus Operator resources for Kubernetes metrics: app `ServiceMonitor` objects for Hono `/metrics`, a Traefik `ServiceMonitor`, `PrometheusRule` alerts, and Grafana dashboard ConfigMaps.

## Docker Standards

- Application Dockerfiles use Turbo pruning before installs.
- Frontend images build standalone Next.js output.
- Service images copy only runtime source, generated clients, shared packages, and production dependencies.
- Runtime containers use Docker Hardened Images where available.
- Compose app services use read-only filesystems, tmpfs for `/tmp`, `no-new-privileges`, and dropped Linux capabilities.
- Traefik routes only explicitly labelled services.
- `make docker-validate` must pass without starting containers.
- `make docker-test` is the source of truth for the complete containerized platform.

## Kubernetes Standards

- Helm charts must render deterministic manifests with `make helm-template`.
- Application pods run as non-root with read-only root filesystems, dropped capabilities, and explicit `/tmp` volumes.
- Workloads expose readiness and liveness probes before being routed.
- Runtime secrets stay outside committed values files.
- Kubernetes routing is owned by Helm through Gateway API HTTPRoutes locally, with standard Ingress still supported for clusters that enable the Kubernetes Ingress provider.
- Docker Compose uses non-conflicting local ports when a local Kubernetes Traefik gateway is active.

## Auth And Security Standards

- Admin mutations must require Clerk-authenticated admin access.
- Public service routes may be unauthenticated only when they expose non-user-specific read data.
- Never log secrets, webhook payload secrets, or bearer tokens.
- Local fallback admin IDs are allowed only through `ADMIN_USER_IDS`.
- Stripe webhook secrets should be read from `STRIPE_WEBHOOK_SECRET` or a mounted Stripe CLI secret file. Signature verification must use the raw body, and the handler must hand work to Kafka before returning promptly.
- Browser calls for authenticated storefront operations should stay same-origin and use Next.js route handlers as the Clerk session boundary.
- CORS origins should be explicit in `.env` and Compose.
