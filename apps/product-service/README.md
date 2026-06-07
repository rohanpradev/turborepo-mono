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

## Development

```bash
bun run dev
bun run check-types
```
