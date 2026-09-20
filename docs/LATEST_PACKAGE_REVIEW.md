# Package research and implementation review

Research snapshot: **7 September 2026**. Final application and local CI verification: **9 September 2026**.

## Decision

Keep the existing package versions and improve how the project uses them. At the research snapshot, all **57 distinct configured catalog, root development, and override entries** matched their npm `latest` versions. `bun outdated --recursive` reported no direct updates. This does not mean every transitive package is latest, nor does an npm `latest` tag guarantee a stable release.

The substantive changes are a current shadcn/Radix dialog implementation, a more compact responsive storefront, Next.js navigation improvements, atomic outbox updates, safer Helm disruption budgets, and deployment smoke tests in CI. The existing Prisma 8 release-candidate migration is preserved and explicitly distinguished from stable packages.

## Release and compatibility decisions

| Component | Verified version | Decision and evidence |
| --- | --- | --- |
| Next.js | 16.3.4 | Keep the stable release. Its patch restores AVIF image optimization after 16.3.3. Do not move the app to 16.4 canaries. [Official release](https://github.com/vercel/next.js/releases/tag/v16.3.4). |
| React / React DOM | 19.2.8 | Keep the matching pair. The release feed is more current than some overview pages. [Official release](https://github.com/react/react/releases/tag/v19.2.8). |
| Bun | 1.4.2 | Keep the repository and CI runtime pin aligned. [Official release](https://bun.com/blog/bun-v1.4.2). |
| Turborepo | 2.10.12 | Keep the current task runner and its existing strict environment handling. [Official release](https://github.com/vercel/turborepo/releases/tag/v2.10.12). |
| Prisma CLI | 8.0.0-rc.13 | Keep the exact prerelease pin. This is not a stable Prisma 8 release. [Official release](https://github.com/prisma/prisma-cli/releases/tag/v8.0.0-rc.13). |
| Prisma PostgreSQL ORM | 8.0.0-rc.8 | Keep the exact pin. Different CLI and ORM RC numbers are intentional: the installed toolchains resolve compatible engine versions. [ORM releases](https://github.com/prisma/orm/releases). |
| Mongoose | 9.9.5 | Keep the patch and strengthen ongoing connection diagnostics. [Official connection documentation](https://mongoosejs.com/docs/connections.html). |
| shadcn CLI | 4.21.0 | Verified through the official npm registry; a CLI version is not a runtime UI package upgrade. Component source is owned by this repository. [Package metadata](https://registry.npmjs.org/shadcn/latest). |
| Radix unified package | 1.6.7 | Added to the central catalog and storefront for the current shadcn Radix dialog source. [Package metadata](https://registry.npmjs.org/radix-ui/latest). |
| Helm | 4.2.4 | Keep the current tool version. [Official release](https://github.com/helm/helm/releases/tag/v4.2.4). |
| Kubernetes | 1.35.8 / 1.36.4 supported; 1.37.0 experimental | Keep the distinction: latest Kubernetes does not imply support from the current Helm minor. [Kubernetes releases](https://kubernetes.io/releases/), [Helm compatibility](https://blog.helm.sh/docs/topics/version_skew/). |

Publisher documentation, release records, npm metadata, installed version-specific documentation, and executable repository checks were used together. Older Prisma roadmap wording and lagging React/Mongoose overview text were not used to override current release metadata. The complete npm snapshot is included below; these are dated findings, not a perpetual claim about future releases.

## Next.js and shadcn UI implementation

**Navigation and data boundaries.** The storefront enables stable `partialPrefetching` alongside Cache Components. Links can reuse route shells while catalog data remains uncached. `ProductList` now explicitly suspends with `io()` before entering the RPC client's error wrapper, preventing a prerender cancellation from becoming a misleading catalog API error. Existing Suspense boundaries retain the loading experience. [Partial prefetching guide](https://nextjs.org/docs/app/guides/adopting-partial-prefetching), [io reference](https://nextjs.org/docs/app/api-reference/functions/io).

**Search.** The search form now uses `next/form` and `useFormStatus`, with named hidden category/sort inputs. Searching preserves relevant filters and resets pagination. The input follows URL navigation through its keyed default value; the existing server normalization still trims the query. This removes custom submission interception and preserves a native GET fallback. [Next.js Form](https://nextjs.org/docs/app/api-reference/components/form).

**Product browsing.** Product cards use a two-column phone layout and three/four-column larger layouts, compact category/price/color information, and a “Choose options” dialog. Size selection, color preview, and bag actions remain available without permanently expanding every card. The catalog heading and toolbar use less vertical space. Loading grids follow the revised column layout. Only the first catalog product receives eager/high-priority image loading; homepage hero priorities remain separate.

**Accessible dialogs.** The dialog source was obtained from the current official shadcn New York Radix registry and adapted to existing colors, dimensions, and utility imports. It uses the unified `radix-ui` package for portals, focus trapping, focus restoration, Escape handling, and modal behavior. Touch close targets are enlarged and dialogs scroll within a bounded viewport. Mobile navigation exposes collections, orders, and account access. [Official component](https://ui.shadcn.com/docs/components/radix/dialog), [registry source](https://ui.shadcn.com/r/styles/new-york-v4/dialog.json).

shadcn now offers multiple primitive families and defaults new projects to Base UI. This existing Radix-based repository uses the supported current Radix implementation rather than mixing primitive APIs or rewriting the admin component family without a demonstrated benefit. The change does not claim every pre-existing custom control has become a generated shadcn component. [shadcn changelog](https://ui.shadcn.com/docs/changelog).

**Truthful bag feedback.** Cart additions now return success/failure. An invalid addition, full bag, or quantity overflow leaves the cart unchanged. Product cards and product detail actions report the limit rather than showing a false success toast or advancing “Buy now” after a rejected addition. Regression tests cover all-or-nothing quantity changes, line capacity, and invalid quantities.

## Database reliability: a regression found by real tests

The fresh PostgreSQL integration run initially failed: twelve competing workers produced nine sends for one outbox event. Inspecting the installed Prisma 8 RC implementation showed that the single-row `update()` terminal first resolves a matching row identity and then updates by primary key. A conditional lookup followed by an identity-only update does not preserve an atomic lease claim under concurrency.

The relay now uses `updateAndCount()` for claiming and finalizing events. The installed implementation compiles the full filter directly into the update statement. The event ID, previous attempt count, availability, and lease conditions remain part of the claim; finalization retains the owning attempt and publishing status. A worker proceeds only when exactly one row was affected. The same real-database suite then passed all six cases, including twelve competing claimants and stale-worker success/failure completion.

This is an implementation finding from the pinned package source and executable tests, not a claim that every Prisma release has identical terminal behavior. The inspected source is `@prisma/orm-family-sql@8.0.0-rc.8/dist/orm-client.mjs`, `update()` and `updateAndCount()`. Future Prisma upgrades must revalidate this contract. [Pinned package metadata](https://registry.npmjs.org/@prisma/orm-family-sql/8.0.0-rc.8).

Delivery remains **at least once**: a crash after broker acknowledgement but before database finalization can still result in a later retry. Consumers must retain event/order idempotency. The database test uses real PostgreSQL and MongoDB with mocked broker transport; it does not prove end-to-end Kafka delivery.

Mongoose now logs ongoing error, disconnection, and reconnection events without including connection URLs or driver error payloads in those event messages. Existing bounded pools, disabled buffering, explicit production indexes, and startup index verification are retained. Disconnection is observed separately because it does not always emit an error. [Mongoose connections](https://mongoosejs.com/docs/connections.html).

## Monorepo, Docker, Helm, and CI

- **Bun:** corrected the isolated-linker documentation. The global store is opt-in, and isolated installs retain a transitive fallback unless `hoist=false` is configured. Docker intentionally uses hoisted installs for portable layers. A stricter install-mode migration was deferred pending clean-install validation of every workspace. [Bun isolated installs](https://bun.com/docs/pm/isolated-installs).
- **Turbo:** retained strict environment mode, output-affecting environment hashes, generated-contract dependencies, explicit build outputs, and uncached database deployment tasks. Secrets passed through to a task are distinct from variables that affect the cache key. [Turbo environment guidance](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables).
- **Docker:** both Next.js builders now preserve `.next/cache` with separate BuildKit cache mounts. CI already had a Next.js cache restore step, so it was retained. Weekly Docker Dependabot coverage groups Bun image references; runtime versions elsewhere in CI still require coordinated review when an update PR arrives. Existing digest pins, non-root runtimes, and provenance/SBOM publication remain. [Docker best practices](https://docs.docker.com/build/building/best-practices/).
- **Helm:** database jobs retain component labels for existing NetworkPolicy coverage, gain an explicit job workload label, and are excluded from application PodDisruptionBudgets using `DoesNotExist` on the job-name label. Deployment selectors remain unchanged. An explicit `backoffLimit: 0` is now preserved. Render-policy tests reject jobs that enter application budgets. No demonstrated service traffic misrouting is claimed: existing Services use named ports absent from the job pods. [Kubernetes disruption budgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/).
- **CI:** added `test:web` after production builds and included it in `ci:verify`. It starts both standalone servers under Bun, checks health and five pages, and fetches every referenced static asset. It validates nonempty assets and CSS content types, plus the unauthenticated admin not-found boundary. Test processes use local ports, clear authentication credentials, point backend URLs at an unavailable local endpoint, and terminate on completion or failure. The generated asset layout mirrors Docker. [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

## Verification and limits

| Check | Result |
| --- | --- |
| Unit/service tests | 99 passed, including five added regression cases |
| PostgreSQL/MongoDB integration | 6 passed after the outbox fix; verified on 7 September |
| Full local CI verification | Lint, dependency policy/deduplication, contract validation, Knip, boundaries, coverage, audit, type checks, and builds passed |
| Type checks | 13 tasks passed |
| Production builds | Both apps passed; also rebuilt with Turbo output-cache reuse disabled |
| Standalone smoke tests | Client: 3 pages / 21 assets; admin: 2 pages / 14 assets; both health endpoints passed |
| Helm | All four profiles across three Kubernetes versions passed lint/schema and policy checks |
| Compose | Both CI Compose configurations validated |
| Docker build checks | Both edited Next.js Dockerfiles passed without warnings |
| Frozen install | Passed with no lockfile changes |
| Vulnerability audit | No reported vulnerabilities in the checked dependency graph |
| Browser | Desktop and phone catalog/dialog checks; variant selection and bag feedback; search preserves filters and resets page; keyboard trapping, Escape, focus restoration, and mobile navigation verified |

A stylesheet failure occurred in the long-lived preview session while builds were being replaced. A fresh standalone session preserved styling when navigating from products to cart, with no browser warnings in that check. The new static-asset smoke test guards deployment output; it is not a full browser end-to-end test.

No GitHub Actions run was triggered, no images were published, and no cluster deployment was performed. Full multi-architecture image execution, live Clerk sign-in, Stripe payments, authenticated admin operations, external image origins, and production failover were not validated in this pass. Those remain environment-dependent checks. The local preview is not a production availability guarantee.

## Complete package snapshot

The following entries matched npm `latest` at the initial research snapshot. Exact installed resolution remains governed by `bun.lock`. Radix 1.6.7 was subsequently added for the dialog; shadcn CLI 4.21.0 was inspected without installing a runtime `shadcn` dependency.

| Package | Configured | npm latest at snapshot | Source |
| --- | --- | --- | --- |
| @biomejs/biome | ^2.5.12 | 2.5.12 | [Registry](https://registry.npmjs.org/%40biomejs%2Fbiome/latest) |
| @clerk/backend | ^3.17.1 | 3.17.1 | [Registry](https://registry.npmjs.org/%40clerk%2Fbackend/latest) |
| @clerk/hono | ^0.1.76 | 0.1.76 | [Registry](https://registry.npmjs.org/%40clerk%2Fhono/latest) |
| @clerk/nextjs | ^7.9.1 | 7.9.1 | [Registry](https://registry.npmjs.org/%40clerk%2Fnextjs/latest) |
| @clerk/shared | ^4.31.0 | 4.31.0 | [Registry](https://registry.npmjs.org/%40clerk%2Fshared/latest) |
| @hono/node-server | ^2.1.1 | 2.1.1 | [Registry](https://registry.npmjs.org/%40hono%2Fnode-server/latest) |
| @hono/zod-openapi | ^1.6.3 | 1.6.3 | [Registry](https://registry.npmjs.org/%40hono%2Fzod-openapi/latest) |
| @orpc/client | ^1.15.0 | 1.15.0 | [Registry](https://registry.npmjs.org/%40orpc%2Fclient/latest) |
| @orpc/contract | ^1.15.0 | 1.15.0 | [Registry](https://registry.npmjs.org/%40orpc%2Fcontract/latest) |
| @orpc/server | ^1.15.0 | 1.15.0 | [Registry](https://registry.npmjs.org/%40orpc%2Fserver/latest) |
| @prisma/orm-postgres | 8.0.0-rc.8 | 8.0.0-rc.8 | [Registry](https://registry.npmjs.org/%40prisma%2Form-postgres/latest) |
| @radix-ui/react-avatar | ^1.2.6 | 1.2.6 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-avatar/latest) |
| @radix-ui/react-dialog | ^1.1.23 | 1.1.23 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-dialog/latest) |
| @radix-ui/react-dropdown-menu | ^2.1.24 | 2.1.24 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-dropdown-menu/latest) |
| @radix-ui/react-separator | ^1.1.15 | 1.1.15 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-separator/latest) |
| @radix-ui/react-slot | ^1.3.3 | 1.3.3 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-slot/latest) |
| @radix-ui/react-tooltip | ^1.2.16 | 1.2.16 | [Registry](https://registry.npmjs.org/%40radix-ui%2Freact-tooltip/latest) |
| @scalar/hono-api-reference | ^0.12.0 | 0.12.0 | [Registry](https://registry.npmjs.org/%40scalar%2Fhono-api-reference/latest) |
| @stripe/react-stripe-js | ^6.9.0 | 6.9.0 | [Registry](https://registry.npmjs.org/%40stripe%2Freact-stripe-js/latest) |
| @stripe/stripe-js | ^9.15.0 | 9.15.0 | [Registry](https://registry.npmjs.org/%40stripe%2Fstripe-js/latest) |
| @tailwindcss/postcss | ^4.3.3 | 4.3.3 | [Registry](https://registry.npmjs.org/%40tailwindcss%2Fpostcss/latest) |
| @types/bun | ^1.4.1 | 1.4.1 | [Registry](https://registry.npmjs.org/%40types%2Fbun/latest) |
| @types/node | ^26.4.1 | 26.4.1 | [Registry](https://registry.npmjs.org/%40types%2Fnode/latest) |
| @types/pg | 8.23.1 | 8.23.1 | [Registry](https://registry.npmjs.org/%40types%2Fpg/latest) |
| @types/react | ^19.2.18 | 19.2.18 | [Registry](https://registry.npmjs.org/%40types%2Freact/latest) |
| @types/react-dom | ^19.2.7 | 19.2.7 | [Registry](https://registry.npmjs.org/%40types%2Freact-dom/latest) |
| babel-plugin-react-compiler | ^1.0.0 | 1.0.0 | [Registry](https://registry.npmjs.org/babel-plugin-react-compiler/latest) |
| class-variance-authority | ^0.7.1 | 0.7.1 | [Registry](https://registry.npmjs.org/class-variance-authority/latest) |
| clsx | ^2.1.1 | 2.1.1 | [Registry](https://registry.npmjs.org/clsx/latest) |
| deepmerge-ts | ^8.0.2 | 8.0.2 | [Registry](https://registry.npmjs.org/deepmerge-ts/latest) |
| defu | ^6.1.7 | 6.1.7 | [Registry](https://registry.npmjs.org/defu/latest) |
| effect | ^3.22.1 | 3.22.1 | [Registry](https://registry.npmjs.org/effect/latest) |
| fast-uri | ^4.1.4 | 4.1.4 | [Registry](https://registry.npmjs.org/fast-uri/latest) |
| find-my-way | ^9.9.0 | 9.9.0 | [Registry](https://registry.npmjs.org/find-my-way/latest) |
| hono | ^4.13.7 | 4.13.7 | [Registry](https://registry.npmjs.org/hono/latest) |
| kafkajs | ^2.2.4 | 2.2.4 | [Registry](https://registry.npmjs.org/kafkajs/latest) |
| knip | ^6.34.0 | 6.34.0 | [Registry](https://registry.npmjs.org/knip/latest) |
| lodash | ^4.18.1 | 4.18.1 | [Registry](https://registry.npmjs.org/lodash/latest) |
| lucide-react | ^1.41.0 | 1.41.0 | [Registry](https://registry.npmjs.org/lucide-react/latest) |
| mongoose | ^9.9.5 | 9.9.5 | [Registry](https://registry.npmjs.org/mongoose/latest) |
| next | ^16.3.4 | 16.3.4 | [Registry](https://registry.npmjs.org/next/latest) |
| pg | ^8.23.0 | 8.23.0 | [Registry](https://registry.npmjs.org/pg/latest) |
| postcss | ^8.5.28 | 8.5.28 | [Registry](https://registry.npmjs.org/postcss/latest) |
| prisma | 8.0.0-rc.13 | 8.0.0-rc.13 | [Registry](https://registry.npmjs.org/prisma/latest) |
| react | ^19.2.8 | 19.2.8 | [Registry](https://registry.npmjs.org/react/latest) |
| react-dom | ^19.2.8 | 19.2.8 | [Registry](https://registry.npmjs.org/react-dom/latest) |
| sharp | ^0.35.4 | 0.35.4 | [Registry](https://registry.npmjs.org/sharp/latest) |
| sonner | ^2.0.8 | 2.0.8 | [Registry](https://registry.npmjs.org/sonner/latest) |
| stripe | ^22.6.1 | 22.6.1 | [Registry](https://registry.npmjs.org/stripe/latest) |
| syncpack | ^15.3.3 | 15.3.3 | [Registry](https://registry.npmjs.org/syncpack/latest) |
| tailwind-merge | ^3.6.0 | 3.6.0 | [Registry](https://registry.npmjs.org/tailwind-merge/latest) |
| tailwindcss | ^4.3.3 | 4.3.3 | [Registry](https://registry.npmjs.org/tailwindcss/latest) |
| turbo | ^2.10.12 | 2.10.12 | [Registry](https://registry.npmjs.org/turbo/latest) |
| typescript | ^7.0.2 | 7.0.2 | [Registry](https://registry.npmjs.org/typescript/latest) |
| valibot | ^1.4.2 | 1.4.2 | [Registry](https://registry.npmjs.org/valibot/latest) |
| zod | ^4.5.4 | 4.5.4 | [Registry](https://registry.npmjs.org/zod/latest) |
| zustand | ^5.0.15 | 5.0.15 | [Registry](https://registry.npmjs.org/zustand/latest) |
