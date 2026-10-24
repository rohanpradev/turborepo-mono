# Engineering review — 22 October 2026

This review updates compatible dependencies and repairs reproducible failures in checkout, inventory, event delivery, and customer reporting. It preserves service ownership, authenticated service boundaries, the transactional product outbox, durable payment jobs, and the MongoDB order projection. No live database migration or deployment was performed.

## Dependency decisions

Versions were checked against the npm registry using `bun outdated --recursive` and registry release metadata. Documentation was checked against installed framework guides and primary release notes. Shared versions remain in the root catalog; workspace declarations retain `catalog:`.

| Dependency                       | Previous        | Updated         |
| -------------------------------- | --------------- | --------------- |
| Next.js                          | 16.4.0          | 16.4.2          |
| React / React DOM                | 19.3.0          | 19.3.1          |
| Clerk Next.js / Hono             | 7.9.14 / 0.1.88 | 7.9.19 / 0.1.92 |
| Clerk backend / shared overrides | 3.23.2 / 4.40.0 | 3.26.1 / 4.41.0 |
| oRPC client / contract / server  | 1.15.5          | 1.16.1          |
| Stripe.js                        | 10.0.0          | 10.1.0          |
| Mongoose                         | 9.11.1          | 9.11.3          |
| Zod                              | 4.6.5           | 4.6.7           |
| Zustand                          | 5.0.15          | 5.0.16          |
| Radix umbrella                   | 1.7.0           | 1.8.1           |
| Radix avatar / dialog            | 1.2.7 / 1.2.0   | 1.3.1 / 1.3.1   |
| Radix dropdown / separator       | 2.1.25 / 1.1.16 | 2.2.1 / 1.2.0   |
| Radix slot / tooltip             | 1.4.0 / 1.3.0   | 1.5.0 / 1.4.1   |
| Lucide React                     | 1.55.0          | 1.61.0          |
| Scalar Hono API reference        | 0.12.11         | 0.12.13         |
| PostCSS                          | 8.5.29          | 8.5.31          |
| Hono Node adapter override       | 2.1.4           | 2.1.5           |
| fast-uri override                | 4.2.1           | 4.2.3           |
| Biome                            | 2.5.15          | 2.6.2           |
| Knip                             | 6.41.0          | 6.42.1          |
| Turborepo                        | 2.11.7          | 2.11.10         |
| Vite, transitive Prisma tooling  | 8.3.2           | 8.3.3           |

The Next.js update includes the October security fixes and subsequent Turbopack repairs. Clerk backend/shared overrides agree with the updated SDK requirements. React Stripe's existing version accepts Stripe.js 10.x and React 19. Turbo's Docker defaults and CI version match the installed release. Bun stays at 1.4.3 and TypeScript at 7.0.2.

The first post-update audit still found vulnerable Vite 8.3.2 under Prisma tooling. `bun audit fix --dry-run` proposed an in-range 8.3.3 patch; applying it corrected the lockfile without a Prisma version change. The repeated audit reported no vulnerabilities across 731 packages.

### Prisma migration deliberately separated

`@prisma/orm-postgres` remains exactly `8.0.0-rc.17`, paired with CLI `8.0.0-rc.22`. Registry candidates `8.0.0-rc.19` and CLI `8.0.0-rc.25` are not drop-in patches. The ORM release removes `@noCheck`, changes nullable-array contracts and client construction, and requires rewriting stored contracts/migration snapshots and signing databases. This repository uses `@noCheck(elementNotNull)` and content-addressed applied migrations.

Upgrade this pair only with a dedicated migration: back up the data, apply both hop recipes to a disposable database, compare storage hashes and migration history, re-emit contracts, update client construction and nullable-list handling, verify rolling compatibility, and rehearse signing and rollback. The current migration graph and generated contract still validate. Rewriting applied snapshots without that evidence would undermine the existing adoption guarantees.

## Findings and implemented changes

| Failure                                                                                                                   | Observable repair                                                                                                                                                      | Regression evidence                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Accessing `sessionStorage` can throw before a helper's error guard. Checkout fails or a verified return becomes an error. | Resolve browser storage lazily inside guarded helpers; reuse attempt identity for component retries.                                                                   | Denied storage getters and retry identity tests.                                                                 |
| Stripe/parser exception messages can contain webhook body text.                                                           | Return a constant invalid-webhook message and retain only a bounded error category in diagnostics.                                                                     | Signed malformed JSON reproduced private-text reflection before the fix.                                         |
| Catalog variant strings can exceed payment metadata or inventory input limits.                                            | Share a 500-character schema across catalog writes, cart/checkout, inventory RPC and reservation input; also validate legacy payment snapshots before reserving stock. | Boundary tests and oversized provider-metadata rejection.                                                        |
| Removing a catalog variant leaves stock that admin APIs refuse to clear.                                                  | Allow zeroing only an exact persisted retired variant; keep the atomic reserved-unit guard. Show retired stock in admin.                                               | Public RPC tests for allowed cleanup, rejected replenishment, exact row matching and held stock.                 |
| Inventory form starts at zero and can accept overlapping writes or stale drafts.                                          | Populate loaded counts, key drafts by product/variant, block duplicate writes, and distinguish saved-but-refresh-failed outcomes.                                      | Type/build checks and backend reservation regressions; authenticated browser interaction remains a manual check. |
| Duplicate payment events change an existing order's `updatedAt`.                                                          | Put both timestamps in `$setOnInsert` and disable Mongoose's update timestamp middleware for this operation.                                                           | Real Mongoose query middleware regression; database integration assertions expanded.                             |
| Kafka parsing strips catalog `imageUrl`.                                                                                  | Preserve the declared field in the event schema.                                                                                                                       | Topic schema regression.                                                                                         |
| Incompatible inventory finalization is reported as an outage.                                                             | Classify terminal-state conflicts as `InventoryConflict` / HTTP 409.                                                                                                   | Database integration assertions expanded for repeated and incompatible finalization.                             |
| HTTP 400 exceptions carry an internal-error RPC code.                                                                     | Map them to `BAD_REQUEST`.                                                                                                                                             | Public inventory RPC response regression.                                                                        |
| Customer aggregation omits new paid sessions whenever the user has any projected order, and can include failed orders.    | Reconcile successful orders and paid activity by stable purchase identifiers; exclude failed/pending totals; retain distinct equal-value purchases.                    | Eight pure aggregation regressions, including four failures reproduced before the fix.                           |
| Limited query windows are labelled lifetime revenue.                                                                      | Label customer totals and paid-item counts as recent-window metrics.                                                                                                   | Reporting code review and web build.                                                                             |

The aggregation logic now has a pure module that can be tested without loading Clerk or server-only data access. Inventory and checkout changes retain their existing interfaces apart from stricter, consistent variant validation. No database schema, event version, persistence ownership, or payment-recovery policy changed.

## Verification

`bun run ci:verify` passed after the complete application patch was stable. The initial suite's temporary-port test failed inside the restricted sandbox; the unchanged test passed with local network binding permitted. The sandboxed Turbopack compilation stalled; the same production build passed with compiler permissions.
- `bun run db:validate`: contract emission and migration graph pass.
- `bun run check-types`: all 14 tasks pass, including tooling and both web apps.
- `bun run deps:check`, `bun run deps:dedupe:check`, `bun run boundaries`: pass.
- `bun run knip`: complete and strict production graphs pass; obsolete Bun `check` exception removed.
- `bun run audit`: no vulnerabilities found.
- `bun run build`: both standalone web builds pass on Next.js 16.4.2.
- `docker compose --env-file .env.example config --quiet`: pass.
- `docker compose --env-file .env.example -f packages/kafka/compose.yml config --quiet`: pass.
- `make helm-lint-supported`, `make helm-lint-experimental`, `make helm-assert-profiles`: pass across the 12 profile/version combinations.
- `bun run lint:ci`: pass.
- `bun run test:coverage`: 176 tests pass, zero failures, 498 assertions; measured line coverage is 71.27%. Database and provider outage paths remain integration-test responsibilities.
- `bun install --frozen-lockfile`: pass with no changes.
- `bun run test:web`: both standalone apps pass health/page/static-asset checks; storefront product streaming and stock-state checks pass.
- `bun check --project integration-tests/tsconfig.json`: pass across 47 files; this checks types without claiming database execution.
- Documentation link check: no broken local links across the root README and 12 Markdown documents under `docs`.

Biome 2.6 adds Markdown/YAML handling, so existing documents and ordinary YAML are normalized. Markdown frontmatter parsing is enabled to preserve skill metadata. Helm Go templates are excluded from its plain-YAML parser and remain covered by Helm-specific gates.

### Verification limits

The Docker daemon is inaccessible from this execution environment. `make helm-validate-supported helm-validate-experimental` was attempted, but kubeconform's container could not start; experimental schema validation was not reached. Live database, Kafka, Stripe, Clerk and container recovery tests were not run. Their unit or static checks do not establish production outage recovery. Expanded integration tests require explicit disposable database names ending in `_test`.

The conservative hold for uncertain Stripe session creation remains intentional under [ADR 0002](adr/0002-payment-inventory.md). When browser persistence is denied, the in-memory fallback preserves retry identity within the mounted checkout; it cannot survive a full page reload. A payment return without its stored cart signature preserves the cart. Customer totals still reflect bounded source queries, not audited lifetime accounting. Authenticated UI operations require a final browser check against a configured environment.

## Primary resources

- [Next.js October 14 security advisory](https://nextjs.org/blog/nextjs-security-update-october-14-2026) and [16.4.2 release](https://github.com/vercel/next.js/releases/tag/v16.4.2).
- [React releases](https://github.com/facebook/react/releases) and [Clerk releases](https://github.com/clerk/javascript/releases).
- [oRPC releases](https://github.com/middleapi/orpc/releases) and installed Next.js/Turborepo documentation matching the lockfile.
- [Stripe metadata limits](https://docs.stripe.com/api/metadata) and [Stripe.js 10.1.0](https://github.com/stripe/stripe-js/releases/tag/v10.1.0).
- [Mongoose timestamps](https://mongoosejs.com/docs/timestamps.html) and [9.11.3 release](https://github.com/Automattic/mongoose/releases/tag/9.11.3).
- [Prisma rc.18](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.18) and [rc.19 breaking changes and upgrade recipes](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.19).
- [Radix releases](https://www.radix-ui.com/primitives/docs/overview/releases), [Biome 2.6.2](https://github.com/biomejs/biome/releases/tag/@biomejs%2Fbiome@2.6.2), and [Turborepo 2.11.10](https://github.com/vercel/turborepo/releases/tag/v2.11.10).
- [Vite file-access advisory](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) and [bundled launch-editor advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm).

For deployment, migration and incident procedures, use [the operating guide](OPERATIONS.md) and [Stripe operations](STRIPE_OPERATIONS.md).
