# @repo/order-db

The order service owns this Mongoose package. Web applications and other services access orders through the order API, never through this database.

## Persisted contract

An order contains `orderId` (the Stripe-backed idempotency key), `userId`, `email`, `amount`, `status` (`success` or `failed`), `products`, and automatic creation/update timestamps. Each product contains `name`, `price`, and `quantity`. Amounts and prices use integer currency minor units; quantities must be positive integers. Orders cannot have an empty product list.

## Index deployment

Production disables automatic index creation. Before starting the order service, set `MONGO_URL` and run:

```sh
bun run --cwd packages/order-db db:deploy
```

This adds declared indexes with `createIndexes()` and verifies the unique `orderId` index. It does not drop indexes or delete records. Existing duplicate IDs intentionally fail index creation; resolve those duplicates before retrying deployment.

Compose runs `order-db-indexes` before `order-service`. Helm runs `jobs.index-order-db` as a pre-install/pre-upgrade hook using the order image and external runtime secret. If the order service is disabled, disable that job too. Development waits for `Order.init()` before verifying indexes. Consumers start only after verification succeeds.

A partial unique index covers string `orderId` values, allowing legacy records without an ID to coexist. User-order and recent-order indexes support descending creation-time queries. Order writes use validated `$setOnInsert` upserts; replaying a payment leaves the existing order intact.

## Connection configuration

| Variable | Default |
| --- | --- |
| `MONGO_URL` | Required |
| `MONGO_MAX_POOL_SIZE` | 20 |
| `MONGO_MAX_IDLE_TIME_MS` | 30000 |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | 5000 |
| `MONGO_WAIT_QUEUE_TIMEOUT_MS` | 5000 |

Numeric values must be positive safe integers. Command buffering is disabled so disconnected requests fail promptly. Size the pool across all replicas against the database's connection budget. Shutdown drains the Kafka consumer before disconnecting Mongoose.

## Verification

`bun run test` checks model validation. `bun run test:integration` deploys indexes to explicitly configured disposable databases and verifies concurrent duplicate delivery and index enforcement. See [quality verification](../../docs/QUALITY_VERIFICATION.md) for setup.

References: [Mongoose connections](https://mongoosejs.com/docs/connections.html), [schema indexes](https://mongoosejs.com/docs/guide.html#indexes), [validation](https://mongoosejs.com/docs/validation.html).
