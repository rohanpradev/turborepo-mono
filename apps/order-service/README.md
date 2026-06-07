# Order Service

MongoDB order read-model service fed by Kafka payment events.

## API

Business operations are exposed through oRPC at `/rpc/order/*` and are defined contract-first in `packages/contracts`.

- `order.listForUser`
- `order.listAll`

Hono still serves operational endpoints such as `/health`, `/health/live`, `/health/ready`, `/openapi.json`, and `/docs`.

## Development

```bash
bun run dev
bun run check-types
```
