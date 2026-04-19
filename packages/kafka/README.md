# @repo/kafka

Typed Kafka helpers for this monorepo, built on top of [KafkaJS](https://kafka.js.org/) and aligned with the local 3-broker Docker cluster.

## What this package does

- Creates a shared KafkaJS client from environment-driven broker settings
- Provides typed producers and consumers for the repo topic map
- Ensures topics exist before services start consuming or producing
- Uses explicit topic management instead of relying on broker-side auto-creation

## Current topic defaults

The repo expects a 3-broker local cluster and creates topics with these defaults unless overridden by environment variables:

- `KAFKA_TOPIC_NUM_PARTITIONS=3`
- `KAFKA_TOPIC_REPLICATION_FACTOR=3`
- `KAFKA_TOPIC_MIN_INSYNC_REPLICAS=2`

These settings match Apache Kafka’s common durability pattern of replication factor `3`, `min.insync.replicas=2`, and producer `acks=all`.

## Environment

Client connection:

- `KAFKA_BROKERS`
- `DOCKER_KAFKA_BROKERS`
- `KAFKA_CONNECTION_TIMEOUT_MS`
- `KAFKA_REQUEST_TIMEOUT_MS`
- `KAFKA_LOG_LEVEL`

Topic creation:

- `KAFKA_TOPIC_NUM_PARTITIONS`
- `KAFKA_TOPIC_REPLICATION_FACTOR`
- `KAFKA_TOPIC_MIN_INSYNC_REPLICAS`

## Local Docker cluster

Start only Kafka from this package directory:

```bash
docker compose up -d
```

Broker endpoints:

- `localhost:9094`
- `localhost:9095`
- `localhost:9096`

Kafka UI:

- `http://localhost:8080`

The Compose file uses Docker Hardened Images, persistent broker volumes, disabled broker-side auto topic creation, and health checks before dependent services start.

## Usage

Create a client:

```ts
import { createKafkaClient } from "@repo/kafka";

const kafka = createKafkaClient("product-service");
```

Produce typed events:

```ts
import { KafkaProducer, Topics, createKafkaClient } from "@repo/kafka";

const kafka = createKafkaClient("payment-service");
const producer = new KafkaProducer(kafka);

await producer.start();
await producer.send(
  Topics.PAYMENT_SUCCESSFUL,
  {
    orderId: "cs_test_123",
    userId: "user_123",
    email: "customer@example.com",
    amount: 2599,
    currency: "usd",
    status: "success",
    paymentMethod: "card",
    transactionId: "pi_123",
    items: [
      {
        productId: "42",
        name: "Everyday Tee",
        quantity: 1,
        price: 2599,
      },
    ],
    processedAt: new Date().toISOString(),
  },
  {
    key: "cs_test_123",
  },
);
await producer.shutdown();
```

Consume typed events:

```ts
import { KafkaConsumer, Topics, createKafkaClient } from "@repo/kafka";

const kafka = createKafkaClient("order-service");
const consumer = new KafkaConsumer(kafka, "order-group");

await consumer.start([
  {
    topicName: Topics.PAYMENT_SUCCESSFUL,
    topicHandler: async (message) => {
      console.log(message.orderId);
    },
  },
]);
```

Ensure topics explicitly:

```ts
import { Topics, createKafkaClient, ensureTopics } from "@repo/kafka";

const kafka = createKafkaClient("service-name");

await ensureTopics(kafka, [
  Topics.PRODUCT_CREATED,
  Topics.PRODUCT_DELETED,
  Topics.PAYMENT_SUCCESSFUL,
]);
```

## Design notes

- Producers disable KafkaJS auto topic creation and use idempotent sends.
- Consumers disable auto topic creation and the batch-consumer path resolves offsets and heartbeats correctly.
- Topic creation fails fast if the cluster does not have enough brokers for the configured replication factor, which avoids silently creating under-replicated topics.

## References

- KafkaJS producer docs: https://kafka.js.org/docs/producing
- KafkaJS consumer docs: https://kafka.js.org/docs/1.15.0/consuming
- KafkaJS admin docs: https://kafka.js.org/docs/admin
- Apache Kafka broker configs: https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka topic configs: https://kafka.apache.org/42/configuration/topic-configs/
- Docker Hardened Kafka guide: https://hub.docker.com/hardened-images/catalog/dhi/kafka/guides
