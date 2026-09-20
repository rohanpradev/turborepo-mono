# Upgrade and verification — September 20, 2026

This review refreshes the existing architecture using public registry metadata, official release notes, installed package documentation, and executable checks. Versions below are a dated snapshot. Historical upgrade reports describe earlier states.

## Package and platform decisions

- React and React DOM remain at 19.3.0; Next.js advances to 16.3.5, Hono to 4.13.8, and Mongoose to 9.10.1. Clerk, oRPC, Stripe React, Zod, Lucide, Tailwind Merge, Biome, Knip, and Turbo also advance. The full registry snapshot appears below. `bun outdated --recursive` reports no outdated workspace dependencies.
- Prisma follows the registry's `latest` tags: CLI **8.0.0-rc.15** and PostgreSQL runtime **8.0.0-rc.11**. These are still release candidates; there is no stable Prisma 8 release to substitute in this snapshot. Their version numbers intentionally differ. Exact pins avoid development builds. The project retains Prisma; no Drizzle migration was made. See [Prisma release status](https://www.prisma.io/docs/orm/release-status), [CLI release](https://github.com/prisma/prisma-cli/releases/tag/v8.0.0-rc.15), and [ORM release](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.11).
- Bun remains at 1.4.2. CI advances to Node **24.21.0**, the latest patch on its existing LTS line; Node 26.9.0 is the newer Current line. Turbo **2.11.2** is aligned across the lockfile, Docker builds, and CI. See [Node releases](https://nodejs.org/en/about/previous-releases) and [Turbo release](https://github.com/vercel/turborepo/releases/tag/v2.11.2).
- Updated direct and transitive versions remain locked. Frozen installs, workspace dependency policies, and existing package overrides remain enforced; registry freshness alone does not prove runtime compatibility.

## Implementation improvements from the documentation

### React and Next.js

Order-history requests now pass their cancellation signal and `no-store` setting through the shared API client. Changing accounts remounts the account-specific content, discards the previous account's state, and aborts its request. Payment-return polling also cancels on cleanup and bounds each request to 15 seconds. These changes follow [React effect cleanup guidance](https://react.dev/reference/react/useEffect).

The admin mobile breakpoint now uses `useSyncExternalStore` with a stable subscription and a consistent server/hydration snapshot. It reads the browser's media-query result directly. See [React external subscriptions](https://react.dev/reference/react/useSyncExternalStore). React 19.3's new visual APIs do not require changing the application's navigation or adding animations; see the [19.3 release notes](https://react.dev/blog/2026/09/09/react-19-3).

Next's installed 16.3 documentation was consulted for server/client boundaries and fetching. Existing standalone deployment, cache boundaries, and the server-side checkout flow are preserved. See [Next 16.3.5](https://github.com/vercel/next.js/releases/tag/v16.3.5).

### Hono and oRPC

Health, readiness, and metrics responses now explicitly disable caching. Middleware is scoped to those paths so it cannot change API response caching or metric route labels. GET and HEAD readiness tests verify dependency state changes. Existing typed routers and the oRPC Hono response adapter already match upstream guidance. See [Hono best practices](https://hono.dev/docs/guides/best-practices), [Hono 4.13.8](https://github.com/honojs/hono/releases/tag/v4.13.8), and [oRPC's Hono adapter](https://orpc.dev/docs/adapters/hono).

Hono's timeout middleware races the response; it does not cancel arbitrary database work. This upgrade does not claim otherwise. Caller cancellation was implemented on the actual fetch paths. See [Hono timeout documentation](https://hono.dev/docs/middleware/builtin/timeout).

### Prisma and Mongoose

The generated Prisma contract now includes explicit relation nullability and the new `Models` namespace. Public row types use the documented `Scalars<Models.…>` helper. The installed ORM's rc.9 → rc.10 and rc.10 → rc.11 upgrade instructions were read before regeneration. Historical migration snapshots remain intact and the storage hash is unchanged (`a8000c3ac164e1ad0f87693c340a4cf4ce40daae9027550506caa9530a9a1d28`).

The existing Mongoose configuration already uses explicit index deployment and bounded connection behavior. It was retained and tested with Mongoose 9.10.1 against MongoDB 8.3.11. Tests verify concurrent duplicate events produce exactly one order. See [Mongoose connections](https://mongoosejs.com/docs/connections.html) and [MongoDB 8.3 release notes](https://www.mongodb.com/docs/manual/release-notes/8.3/).

### Containers, Kubernetes, and CI

| Component | Verified selection |
| --- | --- |
| PostgreSQL | 18.6; refreshed DHI Debian 13 digest |
| MongoDB | 8.3.11; refreshed DHI Debian 13 digest; explicit amd64 platform retained |
| Kafka | 4.3.1 native Debian 13; refreshed DHI digest |
| Stripe CLI | 1.51.0 with immutable digest |
| Traefik | Chart 41.6.0; image 3.7.13 with refreshed digest |
| Monitoring | kube-prometheus-stack 91.4.1 |
| Helm / Gateway API | 4.3.0 / 1.6.2 |
| Docker Buildx / BuildKit | 0.37.1 / 0.33.0 |
| Dockerfile frontend / curl test image | 1.26.0 / 8.22.0; digests verified |
| Kafbat / Docker socket proxy | 1.5.0 / 0.5.0; digests verified |

The Stripe listener translates the previous `STRIPE_CLI_EVENTS=*` setting to `--all-snapshot`, following the [1.51 release](https://github.com/stripe/stripe-cli/releases/tag/v1.51.0). Explicit event lists continue to use `--events`. Four executable tests cover both packaged scripts, wildcard/explicit filtering, and signing-secret redaction.

The controller installers now initialize/update their named Helm repositories and use repository-qualified chart names. Live testing exposed failures caused by missing cache files for unrelated repositories when using unqualified names. CRDs still apply before controller upgrades, following the [monitoring upgrade guide](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/UPGRADE.md). Schema validation now persists downloaded schemas between container runs using [kubeconform's documented cache](https://github.com/yannh/kubeconform#usage).

CI action pins advance to Docker build-push 7.4.0, setup-buildx 4.4.1, setup-qemu 4.4.0, and Sonar scan 8.2.2, using resolved commit hashes. Other action releases were checked and retained. [Build-push 7.4.0](https://github.com/docker/build-push-action/releases/tag/v7.4.0) includes a workflow-command injection fix for metadata logging.

## Verification results

| Check | Result |
| --- | --- |
| Full `bun run ci:verify` | Passed: lint, dependency alignment/deduplication, Prisma validation, Knip, boundaries, coverage, audit, type checks, production builds, web smoke |
| Final unit tests after Stripe compatibility change | **108 passed, 0 failed** |
| Dependency audit | No reported vulnerabilities across 793 packages at audit time |
| Disposable database integration tests | **6 passed**: unique index deployment, concurrent order deduplication, transaction rollback, outbox claim concurrency, stale-worker success/failure protection |
| Container builds | All five application images built successfully with frozen dependency installs |
| Compose configuration | Passed |
| Helm matrix | All four profiles passed lint, core schema validation, and resource/image policies on 1.35.8, 1.36.4, and 1.37.0 |
| Local Kubernetes | Initial observed profile install and in-place full-profile upgrade succeeded on OrbStack **1.35.6+orb1** with Helm 4.3.0 |
| Live rollout | All five deployments ready; payment's Stripe sidecar ready; migration and seed hooks succeeded |
| Helm health test | Succeeded for all five services, including backend dependency readiness |
| HTTPS smoke | Passed storefront/admin health, storefront page, admin image optimization, product RPC, and unsigned Stripe webhook rejection (400) |
| Monitoring | Product, order, payment, and Traefik scrape targets all **up** |

Local evidence is in ignored `.runtime/upgrade-*.log` files. Integration tests used separate databases ending in `_test`; existing application data was not reset. The cluster and backing services remain running.

### Scope of the result

The live cluster uses the Ingress profile on Kubernetes 1.35.6. Kubernetes 1.36/1.37 and Gateway API profiles were rendered and schema/policy checked, not deployed as additional live clusters. Kubeconform skips three Gateway custom resources per Gateway render because core schemas do not include them. Helm 4.3 supports newer Kubernetes versions, while the project continues to label 1.37 experimental pending runtime qualification. See [Helm version skew](https://helm.sh/docs/topics/version_skew/).

No live payment was charged and no authenticated browser purchase was completed. Webhook signature behavior and duplicate persistence are covered by automated tests. The GitHub-hosted workflow and image publication were not run remotely; local builds and checks do not substitute for that future CI run.

## Public package registry snapshot

These versions were queried from each public package's `latest` tag on September 20. Installed workspace versions were checked again after installation and deduplication.

| Package | Latest at review | Source |
| --- | --- | --- |
| @biomejs/biome | 2.5.14 | [Registry](https://registry.npmjs.org/%40biomejs%2Fbiome/latest) |
| @clerk/backend | 3.18.1 | [Registry](https://registry.npmjs.org/%40clerk%2Fbackend/latest) |
| @clerk/hono | 0.1.79 | [Registry](https://registry.npmjs.org/%40clerk%2Fhono/latest) |
| @clerk/nextjs | 7.9.4 | [Registry](https://registry.npmjs.org/%40clerk%2Fnextjs/latest) |
| @clerk/shared | 4.33.0 | [Registry](https://registry.npmjs.org/%40clerk%2Fshared/latest) |
| @hono/node-server | 2.1.1 | [Registry](https://registry.npmjs.org/%40hono%2Fnode-server/latest) |
| @hono/zod-openapi | 1.6.3 | [Registry](https://registry.npmjs.org/%40hono%2Fzod-openapi/latest) |
| @orpc/client | 1.15.2 | [Registry](https://registry.npmjs.org/%40orpc%2Fclient/latest) |
| @orpc/contract | 1.15.2 | [Registry](https://registry.npmjs.org/%40orpc%2Fcontract/latest) |
| @orpc/server | 1.15.2 | [Registry](https://registry.npmjs.org/%40orpc%2Fserver/latest) |
| @prisma/orm-postgres | 8.0.0-rc.11 | [Registry](https://registry.npmjs.org/%40prisma%2Form-postgres/latest) |
| @radix-ui/react-avatar | 1.2.6 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-avatar/latest) |
| @radix-ui/react-dialog | 1.1.23 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-dialog/latest) |
| @radix-ui/react-dropdown-menu | 2.1.24 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-dropdown-menu/latest) |
| @radix-ui/react-separator | 1.1.15 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-separator/latest) |
| @radix-ui/react-slot | 1.3.3 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-slot/latest) |
| @radix-ui/react-tooltip | 1.2.16 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-tooltip/latest) |
| @scalar/hono-api-reference | 0.12.2 | [Registry](https://registry.npmjs.org/%40scalar%2Fhono-api-reference/latest) |
| @stripe/react-stripe-js | 6.10.0 | [Registry](https://registry.npmjs.org/%40stripe%2Freact-stripe-js/latest) |
| @stripe/stripe-js | 9.16.0 | [Registry](https://registry.npmjs.org/%40stripe%2Fstripe-js/latest) |
| @tailwindcss/postcss | 4.3.3 | [Registry](https://registry.npmjs.org/%40tailwindcss%2Fpostcss/latest) |
| @types/bun | 1.4.2 | [Registry](https://registry.npmjs.org/%40types%2Fbun/latest) |
| @types/node | 26.6.2 | [Registry](https://registry.npmjs.org/%40types%2Fnode/latest) |
| @types/pg | 8.23.1 | [Registry](https://registry.npmjs.org/%40types%2Fpg/latest) |
| @types/react | 19.3.0 | [Registry](https://registry.npmjs.org/%40types%2Freact/latest) |
| @types/react-dom | 19.3.0 | [Registry](https://registry.npmjs.org/%40types%2Freact-dom/latest) |
| babel-plugin-react-compiler | 1.0.0 | [Registry](https://registry.npmjs.org/babel-plugin-react-compiler/latest) |
| class-variance-authority | 0.7.1 | [Registry](https://registry.npmjs.org/class-variance-authority/latest) |
| clsx | 2.1.1 | [Registry](https://registry.npmjs.org/clsx/latest) |
| deepmerge-ts | 8.0.2 | [Registry](https://registry.npmjs.org/deepmerge-ts/latest) |
| defu | 6.1.7 | [Registry](https://registry.npmjs.org/defu/latest) |
| effect | 3.22.2 | [Registry](https://registry.npmjs.org/effect/latest) |
| fast-uri | 4.2.1 | [Registry](https://registry.npmjs.org/fast-uri/latest) |
| find-my-way | 9.9.0 | [Registry](https://registry.npmjs.org/find-my-way/latest) |
| hono | 4.13.8 | [Registry](https://registry.npmjs.org/hono/latest) |
| kafkajs | 2.2.4 | [Registry](https://registry.npmjs.org/kafkajs/latest) |
| knip | 6.37.0 | [Registry](https://registry.npmjs.org/knip/latest) |
| lodash | 4.18.1 | [Registry](https://registry.npmjs.org/lodash/latest) |
| lucide-react | 1.47.0 | [Registry](https://registry.npmjs.org/lucide-react/latest) |
| mongoose | 9.10.1 | [Registry](https://registry.npmjs.org/mongoose/latest) |
| next | 16.3.5 | [Registry](https://registry.npmjs.org/next/latest) |
| pg | 8.23.0 | [Registry](https://registry.npmjs.org/pg/latest) |
| postcss | 8.5.28 | [Registry](https://registry.npmjs.org/postcss/latest) |
| prisma | 8.0.0-rc.15 | [Registry](https://registry.npmjs.org/prisma/latest) |
| radix-ui | 1.6.7 | [Registry](https://registry.npmjs.org/radix-ui/latest) |
| react | 19.3.0 | [Registry](https://registry.npmjs.org/react/latest) |
| react-dom | 19.3.0 | [Registry](https://registry.npmjs.org/react-dom/latest) |
| sharp | 0.35.4 | [Registry](https://registry.npmjs.org/sharp/latest) |
| sonner | 2.0.8 | [Registry](https://registry.npmjs.org/sonner/latest) |
| stripe | 22.6.2 | [Registry](https://registry.npmjs.org/stripe/latest) |
| syncpack | 15.3.3 | [Registry](https://registry.npmjs.org/syncpack/latest) |
| tailwind-merge | 3.7.0 | [Registry](https://registry.npmjs.org/tailwind-merge/latest) |
| tailwindcss | 4.3.3 | [Registry](https://registry.npmjs.org/tailwindcss/latest) |
| turbo | 2.11.2 | [Registry](https://registry.npmjs.org/turbo/latest) |
| typescript | 7.0.2 | [Registry](https://registry.npmjs.org/typescript/latest) |
| valibot | 1.5.0 | [Registry](https://registry.npmjs.org/valibot/latest) |
| zustand | 5.0.15 | [Registry](https://registry.npmjs.org/zustand/latest) |
| zod | 4.6.5 | [Registry](https://registry.npmjs.org/zod/latest) |
