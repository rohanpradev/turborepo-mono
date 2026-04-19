import { describe, expect, test } from "bun:test";
import {
  buildTopicConfigs,
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
});
