# @repo/product-db

Shared Prisma client and schema for the product database.

## Overview

This package provides a centralized Prisma configuration for the PostgreSQL product database, used by the product-service.

## Technology

- **ORM**: Prisma
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
# Generate Prisma client
bun run db:generate

# Create and apply migration
bun run db:migrate

# Deploy migrations (production)
bun run db:deploy
```

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_db?schema=public"
```

## Prisma Client

The package exports a singleton Prisma client instance using Prisma's PostgreSQL driver adapter. `connectProductDB()` and `disconnectProductDB()` are available for explicit service lifecycle management.

## Schema Location

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Generated client: `generated/prisma/`
