# Product Service

Catalog service for products and categories.

## API

Business operations are exposed through oRPC at `/rpc/product/*` and are defined contract-first in `packages/contracts`.
- `product.list`
- `product.get`
- `product.create`
- `product.update`
- `product.delete`
- `category.list`
- `category.get`
- `category.create`
- `category.update`
- `category.delete`

Hono still serves operational endpoints such as `/health`, `/health/live`, `/health/ready`, `/openapi.json`, and `/docs`.

Administrators can manage stock for current variants and clear persisted stock
for variants removed from the catalog. Retired variants cannot receive new
stock; reserved units must be resolved before their count can be cleared.
Products remain protected from deletion while any stock row exists.

## Development

```bash
bun run dev
bun run check-types
```
