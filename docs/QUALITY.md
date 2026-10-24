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

| Change type                | Minimum verification                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only         | `bun run lint`                                                                                                                                       |
| Package/catalog changes    | `bun run deps:check`, `bun run deps:dedupe:check`, `bun run lint`, `bun run test`                                                                    |
| Shared types or API client | `bun run test`, `bun run check-types`                                                                                                                |
| Frontend routes/components | `bun run lint`, `bun run check-types`, `bun run build`                                                                                               |
| Hono services              | `bun run test`, `bun run check-types`, `bun run build`                                                                                               |
| Kafka contracts            | `bun run test`, `bun run check-types`, `make docker-validate`                                                                                        |
| Package boundary changes   | `bun run boundaries`, `bun run check-types`                                                                                                          |
| Telemetry changes          | `bun run test`, `bun run check-types`, inspect service logs for `traceId`                                                                            |
| Docker/Compose changes     | `bun run doctor`, `make docker-validate`, `make docker-test` when DHI credentials are available                                                      |
| Helm/Kubernetes changes    | `make helm-validate-supported`, `make helm-validate-experimental`, `make helm-assert-profiles`; `make k8s-verify` after deploying to a local cluster |

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
- Use `bun run test:changed` for a focused local loop and the parallel isolated suite for full verification. All unit test commands use `bun test --check`; the integration runner also checks test types before execution. A type error fails the command before tests run.
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
- All image builds run type checks before producing the runner stage. Keep development dependencies in build stages; copy production workspace dependency links from the production install, including nested workspace dependencies.
- Frontend images build standalone Next.js output.
- Service images copy only runtime source, generated clients, shared packages, and production dependencies.
- Runtime containers use Docker Hardened Images where available.
- Compose app services use read-only filesystems, tmpfs for `/tmp`, `no-new-privileges`, and dropped Linux capabilities.
- Bun's transpiler cache writes under `/tmp`. Bun image and Compose health checks bypass proxies and abort their loopback requests after three seconds.
- Traefik routes only explicitly labelled services.
- `make docker-validate` must pass without starting containers.
- `make docker-test` is the source of truth for the complete containerized platform.

## Kubernetes Standards

- Helm charts must render deterministic manifests with `make helm-template`.
- Application pods run as non-root with read-only root filesystems, dropped capabilities, and explicit `/tmp` volumes.
- Workloads expose readiness and liveness probes before being routed.
- The termination grace period must leave at least 25 seconds after the pre-stop delay for the application's shutdown handler. Helm rejects smaller drain budgets.
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

## Workspace and Next.js maintenance

- Every workspace is private; each workspace that runs type checks declares its own TypeScript compiler dependency through the root catalog. Shared packages expose explicit public entry points.
- `bun run check-types` uses Bun 1.4.4's built-in checker for application/package code and the operational scripts in `scripts/tsconfig.json`. Web checks still run `next typegen` first. CI runs the same tasks; TypeScript remains installed for editors and the independent Next.js build checker.
- Database validation depends on contract generation in Turborepo. Only `db:generate` owns the generated contract outputs; its inputs exclude those outputs to avoid self-invalidating cache keys. When running directly inside `packages/product-db`, run `db:generate` before `db:validate`.
- `NODE_ENV` participates in task hashes. Web type checks restore their generated route types. `bun check` emits no incremental compiler cache; Next.js builds may still produce their own. Tasks that verify or modify a live database are never cached.
- Import runtime service URLs from `@repo/api-client/server` in Next.js server modules. This entry point and the admin data-access modules use `server-only` to reject accidental browser imports. Browser-safe API methods remain at `@repo/api-client`.
- Authenticated RPC requests always use `cache: "no-store"`, including when a caller supplies a cache policy. Public catalog requests retain their explicit policy.
- `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS` is a build-time setting. Pass it through Compose or the repository variable of the same name in CI, then rebuild both web images. Changing a running container's environment does not rewrite Next.js's standalone image configuration.

These conventions follow the version-matched Next.js guides bundled with the installed framework and the official [server/client boundary](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning), [Turborepo task](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks), and [internal package](https://turborepo.dev/docs/core-concepts/internal-packages) guidance.

### Package documentation and strict dependency checks

The [22 October engineering review](ENGINEERING_REVIEW_2026-10-22.md) records dependency updates, primary documentation, corrected failure modes, verification results, and the deferred Prisma contract migration.

Biome 2.6 checks Markdown and ordinary YAML as well as application sources. Markdown frontmatter parsing is enabled so skill metadata remains valid. Helm's `charts/ecommerce/templates` contains Go templates rather than valid YAML and is excluded from Biome parsing; Helm lint, rendering, schema validation, and profile assertions remain its validation path. Generated JSON under `deploy/schemas/*/` is also excluded from general formatting; `bun run --check scripts/generate-kubernetes-schemas.ts --check` verifies all five pinned outputs against their generator and source checksums.

`bun run knip` checks both the complete development graph and the strict production graph. Keep production entry points in `knip.ts`; annotate exports that exist only for regression tests with `@internal`. Keep exceptions narrow and explained. Operational scripts and `knip.ts` are type-checked by the root tooling task.

Local Bun installs disable the transitive fallback with `hoist = false`. The Bun declarations include their `undici-types` dependency, so no root workaround is needed. The local isolated store remains portable; the shared global store requires an explicit `globalStore = true` opt-in. Docker continues to use explicitly hoisted installs for portable image layers. Biome remains the shared formatter and linter; adopting `bun fmt` would require a separate formatting-policy migration.

Tests have explicit strict configurations in `tests/tsconfig.json` and `integration-tests/tsconfig.json`. Modules imported directly across app boundaries by tests use relative internal imports so checking them does not depend on another app's private `@/` alias. Fetch mocks preserve Bun's `fetch.preconnect` shape without unchecked function casts. Knip 6.42 recognizes `bun check`; operational entry points remain explicit so Make-driven scripts are checked too.

See the [Bun 1.4.4 upgrade review](BUN_1.4.4_UPGRADE.md) for the current release decisions and verification, and the [Bun 1.4.3 adoption review](BUN_1.4.3_UPGRADE.md) for the earlier checker adoption and deployment evidence. Coverage must be measured again after runtime upgrades; Bun 1.4.4 corrects branch and asynchronous-code accounting, so earlier percentages are not directly comparable.
