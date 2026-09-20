# Quality and reliability verification — 2026-09-07

This change builds on the existing working tree, including its Prisma 8 contract migration. It preserves the current architecture and dependency versions while addressing concrete correctness, usability, and deployment failures.

## Storefront and administration

- Category navigation and pagination show pending feedback without changing control dimensions. Category controls and color swatches have larger touch targets; every available product color is selectable.
- Product actions identify the product to assistive technology and show confirmation after adding to the bag. Empty search results offer a clear recovery path, preserving independent filters until explicitly cleared.
- The shared storefront class utility now combines `clsx` and `tailwind-merge`. Component overrides reliably replace conflicting base utilities. The sort dropdown's wrapper owns its width, keeping its arrow inside the field and the desktop label on one line.
- Admin dependency indicators distinguish ready, disabled, and unavailable states instead of rendering every dependency green. Removed a stale fixed catalog count from the homepage.
- Both apps use Next.js's default child-process plugin execution. The previous experimental worker-thread override reproduced a production-build failure in which PostCSS parsed a TypeScript component as CSS. Both production builds pass with the default restored.

Browser verification used two disposable local catalog fixtures. Verified desktop product rendering, add-to-bag confirmation, category filtering, no-result search, clear-filters recovery, and a 390-pixel mobile layout. Authentication, Stripe payment submission, and the complete live Kafka workflow were not re-tested in this pass.

## Database and service guarantees

Production order consumers verify the unique order-ID index before subscribing. Index creation is a separate additive deployment operation: Compose waits for `order-db-indexes`, and Helm runs `jobs.index-order-db` before install/upgrade. The Helm job uses the existing externally managed runtime secret. Disable the job when disabling the order service.

For an environment managed outside Compose or Helm:

```sh
# Set MONGO_URL for the target order database first.
bun run --cwd packages/order-db db:deploy
```

Index deployment never drops indexes or deletes duplicate orders. If existing duplicate string order IDs prevent index creation, deployment fails for operator remediation. Development awaits model initialization before checking the index. Orders validate complete payloads before upsert, requiring nonempty line items, integer minor-unit amounts/prices, and positive integer quantities. MongoDB pool configuration rejects invalid numeric settings.

PostgreSQL requires an explicit `DATABASE_URL` in production. Readiness now queries the migrated category table after acquiring the Prisma runtime, so lazy initialization alone cannot report a database as ready. The externally owned pool handles idle-client errors and closes even if Prisma cleanup fails.

Outbox claims compare the event's attempt generation atomically. Finalization and retry updates require the same generation and publishing status, preventing expired workers from overwriting newer claims. Stopping the relay waits for its in-flight operation. Delivery remains **at least once**: a crash after broker acceptance but before marking an event published can still cause replay. Consumers must remain idempotent; these changes do not claim exactly-once delivery or ordering across lease expiry.

All three Bun services explicitly own their HTTP server. Shutdown marks dependencies unavailable, stops accepting requests, waits for active requests and bootstrap work, and then closes background workers before their dependencies. A shared 25-second deadline fits inside the existing 30-second container grace period. Errors in one cleanup step do not skip later steps. Service development uses `--watch` so restarts replace servers, timers, and clients together.

## Monorepo and CI

Type checking uses a transit task to carry dependency hashes while allowing independent workspaces to check in parallel. Prisma generation remains an explicit prerequisite for affected consumers. Bun catalogs, isolated workspace installs, strict Turbo environment handling, signed remote-cache configuration, package boundaries, and frozen installs remain in place. Database deployment and integration tasks are uncached.

The new **Database integration** CI job runs against disposable PostgreSQL and MongoDB services pinned by digest. Docker publication depends on both this job and the existing Quality job. The suite migrates PostgreSQL and deploys MongoDB indexes before testing:

1. Startup rejection when the unique order index is absent, followed by repeatable index creation.
2. Twelve concurrent deliveries persisting exactly one order.
3. Transaction rollback in the installed Prisma 8 runtime.
4. Twelve competing outbox workers producing one successful claim.
5. Stale-worker success and failure leaving a newer claim unchanged.

Run it locally with separate disposable databases:

```sh
INTEGRATION_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/ecommerce_test \
INTEGRATION_MONGO_URL=mongodb://127.0.0.1:27017/ecommerce_test \
bun run test:integration
```

Both URLs must explicitly name databases ending in `_test`. This command applies migrations and temporarily changes index state. Run it without other services using those databases. The Kafka transport is stubbed in these database tests; all claim and persistence operations use real databases.

## Verified results

- 94 unit/service tests and 6 real-database integration tests pass.
- All 13 workspace type-check tasks pass; storefront and admin production builds pass.
- Biome, dependency alignment/deduplication, Knip, package boundaries, and Prisma contract/migration validation pass.
- Compose configuration and all 12 Helm profile policies pass.
- Browser checks listed above pass. No hosted CI run or production deployment was performed.

These checks establish specific guarantees, not a blanket production-readiness certification. Production load testing, backup/restore drills, broker outage tests, and authenticated end-to-end coverage remain separate operational work.

## Official references consulted

- [Bun HTTP server lifecycle](https://bun.sh/docs/runtime/http/server) — draining connections with `server.stop()`.
- [Bun workspaces](https://bun.sh/docs/pm/workspaces) and [isolated installs](https://bun.sh/docs/pm/isolated-installs) — dependency ownership and catalogs.
- [Turborepo task configuration](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) — parallel type checks with transit dependencies.
- [Mongoose connections](https://mongoosejs.com/docs/connections.html) and [schema indexes](https://mongoosejs.com/docs/guide.html#indexes) — production index management and bounded pools.
- [Prisma 8 transaction/runtime reference](https://docs.prisma.io/docs/orm/v8/reference/transactions-and-runtime) — transaction-scoped handles and externally owned pool lifecycle.
- [node-postgres pooling](https://node-postgres.com/features/pooling) — idle-client error handling and pool cleanup.
- Installed Next.js 16.3.4 documentation: `dist/docs/01-app/03-api-reference/04-functions/use-link-status.md` and `dist/docs/03-architecture/accessibility.md`. The default `childProcesses` strategy was verified in the installed `dist/server/config-shared.js`.
