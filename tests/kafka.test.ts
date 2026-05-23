import { describe, expect, test } from "bun:test";
import {
  attachKafkaInstrumentation,
  buildTopicConfigs,
  type KafkaInstrumentationEvent,
  readKafkaBrokers,
  readKafkaTopicDefaults,
  Topics,
} from "../packages/kafka/src/index";

describe("@repo/kafka", () => {
  test("reads brokers from KAFKA_BROKERS with whitespace trimmed", () => {
    const brokers = readKafkaBrokers({
      KAFKA_BROKERS: " broker-a:9092, broker-b:9092 ",
    });

    expect(brokers).toEqual(["broker-a:9092", "broker-b:9092"]);
  });

  test("falls back to DOCKER_KAFKA_BROKERS when KAFKA_BROKERS is unset", () => {
    const brokers = readKafkaBrokers({
      DOCKER_KAFKA_BROKERS: "kafka-1:9092,kafka-2:9092,kafka-3:9092",
    });

    expect(brokers).toEqual(["kafka-1:9092", "kafka-2:9092", "kafka-3:9092"]);
  });

  test("derives durable topic defaults from env overrides", () => {
    const defaults = readKafkaTopicDefaults({
      KAFKA_TOPIC_NUM_PARTITIONS: "6",
      KAFKA_TOPIC_REPLICATION_FACTOR: "3",
      KAFKA_TOPIC_MIN_INSYNC_REPLICAS: "2",
    });

    expect(defaults).toEqual({
      numPartitions: 6,
      replicationFactor: 3,
      minInSyncReplicas: 2,
    });
  });

  test("builds topic configs with explicit partitions, replication, and min ISR", () => {
    const topicConfigs = buildTopicConfigs(
      [Topics.PRODUCT_CREATED, Topics.PAYMENT_SUCCESSFUL],
      {
        numPartitions: 3,
        replicationFactor: 3,
        minInSyncReplicas: 2,
      },
    );

    expect(topicConfigs).toEqual([
      {
        topic: Topics.PRODUCT_CREATED,
        numPartitions: 3,
        replicationFactor: 3,
        configEntries: [
          { name: "min.insync.replicas", value: "2" },
          { name: "compression.type", value: "producer" },
        ],
      },
      {
        topic: Topics.PAYMENT_SUCCESSFUL,
        numPartitions: 3,
        replicationFactor: 3,
        configEntries: [
          { name: "min.insync.replicas", value: "2" },
          { name: "compression.type", value: "producer" },
        ],
      },
    ]);
  });

  test("attaches removable instrumentation listeners", () => {
    const listeners = new Map<
      string,
      (event: KafkaInstrumentationEvent) => void
    >();
    const logs: Array<{ message: string; payload?: Record<string, unknown> }> =
      [];
    const fakeClient = {
      events: {
        CONNECT: "producer.connect",
        REQUEST_TIMEOUT: "producer.network.request_timeout",
      },
      on: (
        eventName: string,
        listener: (event: KafkaInstrumentationEvent) => void,
      ) => {
        listeners.set(eventName, listener);

        return () => listeners.delete(eventName);
      },
    };

    const remove = attachKafkaInstrumentation(fakeClient, {
      clientId: "catalog-service",
      clientType: "producer",
      logger: {
        info: (message, payload) => logs.push({ message, payload }),
        warn: (message, payload) => logs.push({ message, payload }),
      },
    });

    listeners.get("producer.connect")?.({
      id: "1",
      type: "producer.connect",
      timestamp: Date.UTC(2026, 0, 1),
      payload: {},
    });
    listeners.get("producer.network.request_timeout")?.({
      id: "2",
      type: "producer.network.request_timeout",
      timestamp: Date.UTC(2026, 0, 1),
      payload: {
        broker: "kafka-1:9092",
        apiName: "Produce",
      },
    });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      message: "Kafka client connected",
      payload: {
        clientId: "catalog-service",
        clientType: "producer",
      },
    });
    expect(logs[1]?.payload).toMatchObject({
      broker: "kafka-1:9092",
      apiName: "Produce",
    });

    remove();

    expect(listeners.size).toBe(0);
  });
});
