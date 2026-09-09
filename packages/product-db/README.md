# @repo/product-db

Prisma 8 contract, PostgreSQL runtime, and migration graph for the product service.

## Runtime

The package uses only Prisma 8:

- `src/contract.prisma` is the source-of-truth data contract.
- `src/contract.json` and `src/contract.d.ts` are deterministic emitted artifacts.
- `src/client.ts` creates the module-level Prisma 8 PostgreSQL client and the explicitly sized `pg` pool.
- `migrations/app/` contains the content-addressed Prisma 8 migration graph.

```typescript
import { db } from "@repo/product-db";

const products = await db.orm.public.Product
  .where({ categorySlug: "shoes" })
  .orderBy((product) => product.createdAt.desc())
  .limit(20)
  .all();

const product = await db.orm.public.Product.create({
  name: "Product Name",
  shortDescription: "Short description",
  description: "Description",
  price: 2999,
  sizes: ["m"],
  colors: ["black"],
  images: { black: "/products/example.png" },
  categorySlug: "shoes",
  updatedAt: Temporal.Now.plainDateTimeISO("UTC"),
});
```

Use `db.transaction(async (tx) => ...)` for atomic work. Query through `tx.orm` inside the callback; queries made through the module-level `db` are outside that transaction.

## Commands

Run these from this package directory:

```bash
# Emit the deterministic JSON contract and TypeScript types
bun run db:generate

# Emit the contract and verify migration-graph integrity (CI-safe and offline)
bun run db:validate

# Update an unshared local development database and advance the local db ref
bun run db:migrate

# Plan a reviewable migration after editing the contract
bun run db:plan -- --name add_feature

# Apply reviewed migrations to the emitted contract state
bun run db:deploy

# Verify the live database marker and schema
bun run db:verify
```

## Existing database adoption

The checked-in baseline creates the same schema formerly represented by the legacy SQL migration ledger. `db:deploy` runs `prisma db migrate`, which uses the configured contract as its target and replays only reviewed migrations. Deployment errors stop the job; they never trigger automatic database signing.

For an existing unsigned database with the matching legacy schema, explicitly verify and adopt it before deployment:

```bash
DATABASE_URL="postgresql://..." bun run db:adopt
```

`db:adopt` refuses to mark a database whose physical schema differs from the contract. Fresh databases do not need adoption; `db:deploy` applies the baseline from the empty state.

## Environment

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_db?schema=public"
POSTGRES_POOL_MAX=20
POSTGRES_CONNECTION_TIMEOUT_MS=5000
POSTGRES_IDLE_TIMEOUT_MS=30000
```

The long-running service owns one pool for its process lifetime and closes both the Prisma 8 client and the externally supplied pool during graceful shutdown. Short-lived seed scripts call the same lifecycle helpers so they exit cleanly.
