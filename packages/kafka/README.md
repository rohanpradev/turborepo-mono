<div align="center"># @repo/kafka# @repo/kafka# Type-Safe Kafka Package

  <img src="https://kafka.apache.org/logos/kafka_logo--simple.png" alt="Apache Kafka" width="300"/>

# @repo/kafka

A TypeScript Kafka wrapper package for the ecommerce monorepo following [KafkaJS](https://kafka.js.org/) official TypeScript patterns.

A TypeScript Kafka wrapper package for the ecommerce monorepo following [KafkaJS](https://kafka.js.org/) official TypeScript patterns.

[![KafkaJS](https://img.shields.io/badge/KafkaJS-2.2.4-blue)](https://kafka.js.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)## InstallationA lightweight Kafka wrapper package for the ecommerce monorepo. This package provides simple utilities to create Kafka clients, producers, and consumers following [KafkaJS](https://kafka.js.org/) best practices.A fully type-safe Kafka implementation for your e-commerce platform using TypeScript and KafkaJS.

[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-latest-red)](https://kafka.apache.org/)

</div>

---This is an internal workspace package. It's automatically available to all apps in the monorepo.

## Installation

This is an internal workspace package. It's automatically available to all apps in the monorepo.```typescript## Installation## Features

```typescriptimport { createKafkaClient, KafkaProducer, KafkaConsumer } from "@repo/kafka";

import { createKafkaClient, KafkaProducer, KafkaConsumer } from "@repo/kafka";

```

## Configuration

The Kafka cluster is configured with 3 brokers:## ConfigurationThis is an internal workspace package. It's automatically available to all apps in the monorepo.- ✅ **Full Type Safety**: Messages are type-checked based on the topic

- `localhost:9094`

- `localhost:9095`

- `localhost:9096`

The Kafka cluster is configured with 3 brokers:- ✅ **Generic Topic System**: Easy to add new topics and event types

## Starting Kafka

- `localhost:9094`

```````bash

cd packages/kafka- `localhost:9095````typescript- ✅ **Producer & Consumer APIs**: Simple, intuitive APIs for producing and consuming messages

docker compose up -d

```- `localhost:9096`



Access Kafka UI at `http://localhost:8080`import { createKafkaClient, createProducer, createConsumer } from "@repo/kafka";- ✅ **Transaction Support**: Send multiple messages atomically



## Usage## Starting Kafka



### Creating a Kafka Client```- ✅ **Batch Operations**: Efficiently send multiple messages at once



```typescript```bash

import { createKafkaClient } from "@repo/kafka";

cd packages/kafka- ✅ **Error Handling**: Built-in retry and error handling

const kafka = createKafkaClient("my-service-name");

```docker compose up -d



### Producer Example (Class-Based - Recommended)```## Configuration- ✅ **Event Metadata**: Automatic addition of eventId, timestamp, and version



```typescript

import { createKafkaClient, KafkaProducer } from "@repo/kafka";

Access Kafka UI at `http://localhost:8080`

const kafka = createKafkaClient("product-service");

const producer = new KafkaProducer(kafka);



const run = async () => {## UsageThe Kafka cluster is configured with 3 brokers:## Installation

  // Connect the producer

  await producer.start();



  // Send a single message### Creating a Kafka Client- `localhost:9094`

  await producer.send("product.created", {

    id: "123",

    name: "Product Name",

    price: 99.99,```typescript- `localhost:9095`This package is already set up in your monorepo. The Kafka cluster runs on Docker:

  });

import { createKafkaClient } from "@repo/kafka";

  // Send batch messages

  await producer.sendBatch([- `localhost:9096`

    { topic: "product.created", message: { id: "1", name: "Product 1", price: 10 } },

    { topic: "product.created", message: { id: "2", name: "Product 2", price: 20 } },const kafka = createKafkaClient("my-service-name");

  ]);

``````bash

  // Shutdown when done

  // await producer.shutdown();

};

### Producer Example (Class-Based - Recommended)## Starting Kafkacd packages/kafka

run().catch(console.error);

```````

### Consumer Example (Class-Based - Recommended)```typescriptdocker compose up -d

````typescriptimport { createKafkaClient, KafkaProducer } from "@repo/kafka";

import { createKafkaClient, KafkaConsumer } from "@repo/kafka";

```bash```

const kafka = createKafkaClient("payment-service");

const consumer = new KafkaConsumer(kafka, "payment-group");const kafka = createKafkaClient("product-service");



const run = async () => {const producer = new KafkaProducer(kafka);cd packages/kafka

  // Start consumer with topic handlers

  await consumer.start([

    {

      topicName: "product.created",const run = async () => {docker compose up -dAccess Kafka UI at: http://localhost:8080

      topicHandler: async (message) => {

        console.log("Product created:", message);  // Connect the producer

        // Handle the message

      },  await producer.start();```

    },

    {

      topicName: "product.deleted",

      topicHandler: async (message) => {  // Send a single message## Kafka Brokers

        console.log("Product deleted:", message);

        // Handle the message  await producer.send("product.created", {

      },

    },    id: "123",Access Kafka UI at `http://localhost:8080`

  ]);

};    name: "Product Name",



run().catch(console.error);    price: 99.99,- Broker 1: `localhost:9094`



// Graceful shutdown  });

const errorTypes = ["unhandledRejection", "uncaughtException"];

const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];## Usage- Broker 2: `localhost:9095`



errorTypes.forEach((type) => {  // Send batch messages

  process.on(type, async (e) => {

    try {  await producer.sendBatch([- Broker 3: `localhost:9096`

      console.log(`process.on ${type}`);

      console.error(e);    { topic: "product.created", message: { id: "1", name: "Product 1", price: 10 } },

      await consumer.shutdown();

      process.exit(0);    { topic: "product.created", message: { id: "2", name: "Product 2", price: 20 } },### Creating a Kafka Client

    } catch (_) {

      process.exit(1);  ]);

    }

  });## Quick Start

});

  // Shutdown when done

signalTraps.forEach((type) => {

  process.once(type, async () => {  // await producer.shutdown();```typescript

    try {

      await consumer.shutdown();};

    } finally {

      process.kill(process.pid, type);import { createKafkaClient } from "@repo/kafka";### Producer Example

    }

  });run().catch(console.error);

});

````

### Batch Consumer Example

For high-throughput scenarios, use batch processing:### Consumer Example (Class-Based - Recommended)const kafka = createKafkaClient("my-service-name");```typescript

````typescript

import { createKafkaClient, KafkaConsumer } from "@repo/kafka";

```typescript```import { producer, TopicName } from '@repo/kafka';

const kafka = createKafkaClient("order-service");

const consumer = new KafkaConsumer(kafka, "order-group");import { createKafkaClient, KafkaConsumer } from "@repo/kafka";



const run = async () => {

  // Process messages in batches

  await consumer.startBatch([const kafka = createKafkaClient("payment-service");

    {

      topicName: "payment.successful",const consumer = new KafkaConsumer(kafka, "payment-group");### Producer Example// Connect the producer

      topicHandler: async (message) => {

        // Each message in the batch is processed

        await processPayment(message);

      },const run = async () => {await producer.connect();

    },

  ]);  // Start consumer with topic handlers

};

  await consumer.start([```typescript

run().catch(console.error);

```    {



## Complete Service Example      topicName: "product.created",import { createKafkaClient, createProducer } from "@repo/kafka";// Send an order success message (fully type-safe!)



### Kafka Setup (`utils/kafka.ts`)      topicHandler: async (message) => {



```typescript        console.log("Product created:", message);await producer.sendMessage(TopicName.ORDER_SUCCESSFUL, {

import { createKafkaClient, KafkaProducer, KafkaConsumer } from "@repo/kafka";

        // Handle the message

const kafkaClient = createKafkaClient("order-service");

      },const kafka = createKafkaClient("product-service");  orderId: 'order-123',

export const producer = new KafkaProducer(kafkaClient);

export const consumer = new KafkaConsumer(kafkaClient, "order-group");    },

````

    {const producer = createProducer(kafka);  userId: 'user-456',

### Consumer Subscriptions (`utils/subscriptions.ts`)

      topicName: "product.deleted",

```typescript

import { consumer } from "./kafka";      topicHandler: async (message) => {  totalAmount: 99.99,

import { createOrder } from "./order";

        console.log("Product deleted:", message);

export const runKafkaSubscriptions = async () => {

  await consumer.start([        // Handle the messageconst run = async () => {  paymentId: 'payment-789',

    {

      topicName: "payment.successful",      },

      topicHandler: async (message) => {

        const order = message;    },  // Connect the producer  status: 'confirmed',

        await createOrder(order);

      },  ]);

    },

  ]);};  await producer.connect();  confirmedAt: new Date().toISOString(),

};

```

### Service Initialization (`index.ts`)run().catch(console.error);});

````typescript

import { producer } from "./utils/kafka";

import { runKafkaSubscriptions } from "./utils/subscriptions";// Graceful shutdown  // Send a message



const startService = async () => {const errorTypes = ["unhandledRejection", "uncaughtException"];

  // Start producer

  await producer.start();const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];  await producer.send("product.created", {// TypeScript will catch errors if you miss required fields or use wrong types!



  // Start consuming messages

  await runKafkaSubscriptions();

  errorTypes.forEach((type) => {    id: "123",```

  // Start your API server

  app.listen(3000, () => {  process.on(type, async (e) => {

    console.log("Service started on port 3000");

  });    try {    name: "Product Name",

};

      console.log(`process.on ${type}`);

startService().catch(console.error);

      console.error(e);    price: 99.99,### Consumer Example

// Graceful shutdown

process.on("SIGTERM", async () => {      await consumer.shutdown();

  await producer.shutdown();

  await consumer.shutdown();      process.exit(0);  });

  process.exit(0);

});    } catch (_) {

````

      process.exit(1);```typescript

## Factory Function API (Backward Compatible)

    }

You can also use the factory functions instead of classes:

}); // Don't forget to disconnect when shutting downimport { TypeSafeConsumer, TopicName } from '@repo/kafka';

````typescript

import { createKafkaClient, createProducer, createConsumer } from "@repo/kafka";});



const kafka = createKafkaClient("service-name");  // await producer.disconnect();

const producer = createProducer(kafka); // Returns KafkaProducer instance

const consumer = createConsumer(kafka, "group-id"); // Returns KafkaConsumer instancesignalTraps.forEach((type) => {



// Same API as class-based approach  process.once(type, async () => {};// Create a consumer with a unique group ID

await producer.start();

await producer.send("topic", { data: "value" });    try {



await consumer.start([      await consumer.shutdown();const consumer = new TypeSafeConsumer('order-service');

  {

    topicName: "topic",    } finally {

    topicHandler: async (message) => {

      console.log(message);      process.kill(process.pid, type);run().catch(console.error);

    },

  },    }

]);

```  });```// Register a fully type-safe handler



## Topics});



Current topics used in the system:```consumer.on(TopicName.ORDER_SUCCESSFUL, async (message, metadata) => {



- `product.created` - Emitted when a product is created

- `product.deleted` - Emitted when a product is deleted

- `payment.successful` - Emitted when a payment is successful### Batch Consumer Example### Consumer Example  // `message` is fully typed as OrderSuccessfulMessage



## Error Handling



All methods include proper error handling and logging. Errors are thrown to allow the calling code to handle them appropriately.For high-throughput scenarios, use batch processing:  console.log('Order successful:', message.orderId);



### Producer Errors



If a producer fails to send a message, the error will be logged and thrown.```typescript```typescript  console.log('Total amount:', message.totalAmount);



### Consumer Errorsimport { createKafkaClient, KafkaConsumer } from "@repo/kafka";



If a consumer fails to process a message, the error will be logged and thrown, preventing the message from being committed. This allows Kafka to retry the message delivery.import { createKafkaClient, createConsumer } from "@repo/kafka";  console.log('Payment ID:', message.paymentId);



## API Referenceconst kafka = createKafkaClient("order-service");



### `createKafkaClient(serviceName: string)`const consumer = new KafkaConsumer(kafka, "order-group");



Creates a Kafka client instance.



**Parameters:**const run = async () => {const kafka = createKafkaClient("payment-service");  // Handle your business logic here

- `serviceName` - Unique identifier for your service

  // Process messages in batches

**Returns:** Kafka client instance

  await consumer.startBatch([const consumer = createConsumer(kafka, "payment-group");});

### `KafkaProducer`

    {

TypeScript class for producing messages (follows official KafkaJS pattern).

      topicName: "payment.successful",

**Constructor:**

```typescript      topicHandler: async (message) => {

new KafkaProducer(kafka: Kafka)

```        // Each message in the batch is processedconst run = async () => {// Start consuming



**Methods:**        await processPayment(message);

- `start(): Promise<void>` - Connect the producer

- `send<T>(topic: string, message: T): Promise<void>` - Send a single message      },  // Connect the consumerawait consumer.start();

- `sendBatch<T>(messages: Array<{topic: string, message: T}>): Promise<void>` - Send batch messages

- `shutdown(): Promise<void>` - Disconnect the producer    },



### `KafkaConsumer`  ]);  await consumer.connect();```



TypeScript class for consuming messages (follows official KafkaJS pattern).};



**Constructor:**

```typescript

new KafkaConsumer(kafka: Kafka, groupId: string)run().catch(console.error);

````

```````// Subscribe to topics with handlers## Available Topics

**Methods:**

- `start<T>(topics: Array<TopicHandler<T>>): Promise<void>` - Start consuming messages (eachMessage)

- `startBatch<T>(topics: Array<TopicHandler<T>>): Promise<void>` - Start batch consuming (eachBatch)

- `shutdown(): Promise<void>` - Disconnect the consumer## Complete Service Example  await consumer.subscribe([



**TopicHandler Interface:**

```typescript

interface TopicHandler<T = any> {### Kafka Setup (`utils/kafka.ts`)    {### Order Events

  topicName: string;

  topicHandler: (message: T) => Promise<void>;

}

``````typescript      topicName: "product.created",- `TopicName.ORDER_CREATED` - New order created



### Factory Functionsimport { createKafkaClient, KafkaProducer, KafkaConsumer } from "@repo/kafka";



- `createProducer(kafka: Kafka): KafkaProducer` - Creates a producer instance      topicHandler: async (message) => {- `TopicName.ORDER_UPDATED` - Order status updated

- `createConsumer(kafka: Kafka, groupId: string): KafkaConsumer` - Creates a consumer instance

const kafkaClient = createKafkaClient("order-service");

## Best Practices

        console.log("Product created:", message);- `TopicName.ORDER_SUCCESSFUL` - Order completed successfully

1. **Use Class-Based API**: Follows official KafkaJS TypeScript examples

2. **Connection Management**: Call `start()` once when your service startsexport const producer = new KafkaProducer(kafkaClient);

3. **Error Handling**: Always wrap Kafka operations in try-catch blocks

4. **Graceful Shutdown**: Use `shutdown()` on producers and consumers during app shutdownexport const consumer = new KafkaConsumer(kafkaClient, "order-group");        // Handle the message- `TopicName.ORDER_FAILED` - Order failed

5. **Consumer Groups**: Use meaningful consumer group IDs for each service

6. **Idempotency**: Design message handlers to be idempotent (safe to retry)```

7. **Topic Naming**: Use dot notation (e.g., `product.created`, `payment.successful`)

8. **Batch Processing**: Use `startBatch()` for high-throughput scenarios      },- `TopicName.ORDER_CANCELLED` - Order cancelled



## References### Consumer Subscriptions (`utils/subscriptions.ts`)



- [KafkaJS Official Documentation](https://kafka.js.org/)    },

- [KafkaJS TypeScript Producer Example](https://kafka.js.org/docs/producer-example#typescript-example)

- [KafkaJS TypeScript Consumer Example](https://kafka.js.org/docs/consumer-example#typescript-example)```typescript

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)

import { consumer } from "./kafka";    {### Payment Events

import { createOrder } from "./order";

      topicName: "product.deleted",- `TopicName.PAYMENT_INITIATED` - Payment started

export const runKafkaSubscriptions = async () => {

  await consumer.start([      topicHandler: async (message) => {- `TopicName.PAYMENT_SUCCESSFUL` - Payment completed

    {

      topicName: "payment.successful",        console.log("Product deleted:", message);- `TopicName.PAYMENT_FAILED` - Payment failed

      topicHandler: async (message) => {

        const order = message;        // Handle the message

        await createOrder(order);

      },      },### Product Events

    },

  ]);    },- `TopicName.PRODUCT_CREATED` - New product added

};

```  ]);- `TopicName.PRODUCT_UPDATED` - Product updated



### Service Initialization (`index.ts`)};- `TopicName.PRODUCT_DELETED` - Product removed



```typescript- `TopicName.PRODUCT_STOCK_UPDATED` - Stock level changed

import { producer } from "./utils/kafka";

import { runKafkaSubscriptions } from "./utils/subscriptions";run().catch(console.error);



const startService = async () => {### User Events

  // Start producer

  await producer.start();// Graceful shutdown- `TopicName.USER_CREATED` - New user registered



  // Start consuming messagesconst errorTypes = ["unhandledRejection", "uncaughtException"];- `TopicName.USER_UPDATED` - User profile updated

  await runKafkaSubscriptions();

  const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];- `TopicName.USER_DELETED` - User account deleted

  // Start your API server

  app.listen(3000, () => {

    console.log("Service started on port 3000");

  });errorTypes.forEach((type) => {## Advanced Usage

};

  process.on(type, async (e) => {

startService().catch(console.error);

    try {### Batch Messages

// Graceful shutdown

process.on("SIGTERM", async () => {      console.log(`process.on ${type}`);

  await producer.shutdown();

  await consumer.shutdown();      console.error(e);```typescript

  process.exit(0);

});      await consumer.disconnect();await producer.sendBatch(TopicName.PRODUCT_STOCK_UPDATED, [

```````

      process.exit(0);  { productId: 'prod-1', previousStock: 100, newStock: 95, reason: 'sale' },

## Factory Function API (Backward Compatible)

    } catch (_) {  { productId: 'prod-2', previousStock: 50, newStock: 45, reason: 'sale' },

You can also use the factory functions instead of classes:

      process.exit(1);]);

`````typescript

import { createKafkaClient, createProducer, createConsumer } from "@repo/kafka";    }```



const kafka = createKafkaClient("service-name");  });

const producer = createProducer(kafka); // Returns KafkaProducer instance

const consumer = createConsumer(kafka, "group-id"); // Returns KafkaConsumer instance});### Transactions (All or Nothing)



// Same API as class-based approach

await producer.start();

await producer.send("topic", { data: "value" });signalTraps.forEach((type) => {```typescript



await consumer.start([  process.once(type, async () => {await producer.sendTransaction([

  {

    topicName: "topic",    try {  {

    topicHandler: async (message) => {

      console.log(message);      await consumer.disconnect();    topic: TopicName.ORDER_CREATED,

    },

  },    } finally {    message: { /* order data */ },

]);

```      process.kill(process.pid, type);    key: 'user-123',



## Topics    }  },



Current topics used in the system:  });  {



- `product.created` - Emitted when a product is created});    topic: TopicName.PAYMENT_INITIATED,

- `product.deleted` - Emitted when a product is deleted

- `payment.successful` - Emitted when a payment is successful```    message: { /* payment data */ },



## Error Handling    key: 'user-123',



All methods include proper error handling and logging. Errors are thrown to allow the calling code to handle them appropriately.## Complete Service Example  },



### Producer Errors]);



If a producer fails to send a message, the error will be logged and thrown.### Kafka Setup (`utils/kafka.ts`)```



### Consumer Errors



If a consumer fails to process a message, the error will be logged and thrown, preventing the message from being committed. This allows Kafka to retry the message delivery.```typescript### Multiple Topic Handlers



## API Referenceimport { createConsumer, createKafkaClient, createProducer } from "@repo/kafka";



### `createKafkaClient(serviceName: string)````typescript



Creates a Kafka client instance.const kafkaClient = createKafkaClient("order-service");const consumer = new TypeSafeConsumer('payment-service');



**Parameters:**

- `serviceName` - Unique identifier for your service

export const producer = createProducer(kafkaClient);consumer.subscribeMultiple([

**Returns:** Kafka client instance

export const consumer = createConsumer(kafkaClient, "order-group");  {

### `KafkaProducer`

```    topic: TopicName.PAYMENT_SUCCESSFUL,

TypeScript class for producing messages (follows official KafkaJS pattern).

    handler: async (message) => {

**Constructor:**

```typescript### Consumer Subscriptions (`utils/subscriptions.ts`)      // Handle successful payment

new KafkaProducer(kafka: Kafka)

```    },



**Methods:**```typescript  },

- `start(): Promise<void>` - Connect the producer

- `send<T>(topic: string, message: T): Promise<void>` - Send a single messageimport { consumer } from "./kafka";  {

- `sendBatch<T>(messages: Array<{topic: string, message: T}>): Promise<void>` - Send batch messages

- `shutdown(): Promise<void>` - Disconnect the producerimport { createOrder } from "./order";    topic: TopicName.PAYMENT_FAILED,



### `KafkaConsumer`    handler: async (message) => {



TypeScript class for consuming messages (follows official KafkaJS pattern).export const runKafkaSubscriptions = async () => {      // Handle failed payment



**Constructor:**  await consumer.connect();    },

```typescript

new KafkaConsumer(kafka: Kafka, groupId: string)  },

`````

await consumer.subscribe([]);

**Methods:**

- `start<T>(topics: Array<TopicHandler<T>>): Promise<void>` - Start consuming messages (eachMessage) {

- `startBatch<T>(topics: Array<TopicHandler<T>>): Promise<void>` - Start batch consuming (eachBatch)

- `shutdown(): Promise<void>` - Disconnect the consumer topicName: "payment.successful",await consumer.start();

**TopicHandler Interface:** topicHandler: async (message) => {```

````typescript

interface TopicHandler<T = any> {        const order = message;

  topicName: string;

  topicHandler: (message: T) => Promise<void>;        await createOrder(order);## See Also

}

```      },



### Factory Functions    },Check `src/examples.ts` for more detailed usage examples!



- `createProducer(kafka: Kafka): KafkaProducer` - Creates a producer instance  ]);

- `createConsumer(kafka: Kafka, groupId: string): KafkaConsumer` - Creates a consumer instance};

````

## Best Practices

### Service Initialization (`index.ts`)

1. **Use Class-Based API**: Follows official KafkaJS TypeScript examples

2. **Connection Management**: Call `start()` once when your service starts```typescript

3. **Error Handling**: Always wrap Kafka operations in try-catch blocksimport { producer } from "./utils/kafka";

4. **Graceful Shutdown**: Use `shutdown()` on producers and consumers during app shutdownimport { runKafkaSubscriptions } from "./utils/subscriptions";

5. **Consumer Groups**: Use meaningful consumer group IDs for each service

6. **Idempotency**: Design message handlers to be idempotent (safe to retry)const startService = async () => {

7. **Topic Naming**: Use dot notation (e.g., `product.created`, `payment.successful`) // Connect producer

8. **Batch Processing**: Use `startBatch()` for high-throughput scenarios await producer.connect();

## References // Start consuming messages

await runKafkaSubscriptions();

- [KafkaJS Official Documentation](https://kafka.js.org/)

- [KafkaJS TypeScript Producer Example](https://kafka.js.org/docs/producer-example#typescript-example) // Start your API server

- [KafkaJS TypeScript Consumer Example](https://kafka.js.org/docs/consumer-example#typescript-example) app.listen(3000, () => {

      console.log("Service started on port 3000");

  });
  };

startService().catch(console.error);

// Graceful shutdown
process.on("SIGTERM", async () => {
await producer.disconnect();
await consumer.disconnect();
process.exit(0);
});

```

## Topics

Current topics used in the system:

- `product.created` - Emitted when a product is created
- `product.deleted` - Emitted when a product is deleted
- `payment.successful` - Emitted when a payment is successful

## Error Handling

All methods include proper error handling and logging. Errors are thrown to allow the calling code to handle them appropriately.

### Producer Errors

If a producer fails to send a message, the error will be logged and thrown.

### Consumer Errors

If a consumer fails to process a message, the error will be logged and thrown, preventing the message from being committed. This allows Kafka to retry the message delivery.

## API Reference

### `createKafkaClient(serviceName: string)`

Creates a Kafka client instance.

**Parameters:**
- `serviceName` - Unique identifier for your service

**Returns:** Kafka client instance

### `createProducer(kafka: Kafka)`

Creates a Kafka producer.

**Returns:** Object with methods:
- `connect()` - Connect the producer
- `send(topic: string, message: object)` - Send a message to a topic
- `disconnect()` - Disconnect the producer

### `createConsumer(kafka: Kafka, groupId: string)`

Creates a Kafka consumer.

**Parameters:**
- `kafka` - Kafka client instance
- `groupId` - Consumer group ID

**Returns:** Object with methods:
- `connect()` - Connect the consumer
- `subscribe(topics: Array<{topicName: string, topicHandler: (message: any) => Promise<void>}>)` - Subscribe to topics
- `disconnect()` - Disconnect the consumer

## Best Practices

1. **Connection Management**: Connect once when your service starts
2. **Error Handling**: Always wrap Kafka operations in try-catch blocks
3. **Graceful Shutdown**: Disconnect producers and consumers on application shutdown
4. **Consumer Groups**: Use meaningful consumer group IDs for each service
5. **Idempotency**: Design message handlers to be idempotent (safe to retry)
6. **Topic Naming**: Use dot notation for topic names (e.g., `product.created`, `payment.successful`)

## References

- [KafkaJS Official Documentation](https://kafka.js.org/)
- [KafkaJS Producer Example](https://kafka.js.org/docs/producer-example)
- [KafkaJS Consumer Example](https://kafka.js.org/docs/consumer-example)
```
