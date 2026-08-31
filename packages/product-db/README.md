# @repo/product-db

Shared Prisma data layer and schema contracts for the product database.

## Overview

This package provides a centralized Prisma configuration for the PostgreSQL product database, used by the product-service.

## Technology

- **ORM**: Prisma 8 contract/runtime with an explicitly namespaced Prisma 7 compatibility client
- **Database**: PostgreSQL
- **Driver Adapter**: `@prisma/adapter-pg`

## Database Schema

### Models

**Product**

- Product catalog with variants (sizes, colors)
- Image storage as JSON
- Category relationship

**Category**

- Product categorization
- Unique slug for URLs

## Usage

```typescript
import { prisma } from "@repo/product-db";
import type { Product, Category, Prisma } from "@repo/product-db";

// Query products
const products = await prisma.product.findMany({
  where: { categorySlug: "electronics" },
  include: { category: true },
});

// Create product
const product = await prisma.product.create({
  data: {
    name: "Product Name",
    price: 2999,
    categorySlug: "electronics",
  },
});
```

## Scripts

```bash
# Generate the Prisma 7 compatibility client and emit the Prisma 8 contract
bun run db:generate

# Validate the schema and Prisma configuration
bun run db:validate

# Create and apply a migration through the current Prisma 7 owner
bun run db:migrate

# Deploy migrations (production)
bun run db:deploy
```

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_db?schema=public"
```

## Prisma Client

Prisma 8 is the primary CLI and PostgreSQL runtime. Its contract is inferred from the same database and emitted during validation/builds. Existing product queries continue through the namespaced Prisma 7 compatibility client until their query and transaction behavior has moved to Prisma 8; Prisma 7 remains the migration owner during that supported side-by-side phase. `connectProductDB()` and `disconnectProductDB()` are available for explicit service lifecycle management.

## Schema Location

- Prisma 8 contract: `prisma8/contract.prisma`
- Prisma 8 configuration: `prisma.config.ts`
- Prisma 7 compatibility schema: `prisma/schema.prisma`
- Prisma 7 compatibility configuration: `prisma7.config.ts`
- Current migrations: `prisma/migrations/`
- Generated artifacts: `generated/prisma8/` and `generated/prisma/`
