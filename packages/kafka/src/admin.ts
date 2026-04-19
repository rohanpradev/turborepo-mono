import type { ITopicConfig, Kafka } from "kafkajs";
import type { TopicName } from "./types";

type KafkaTopicEnv = {
  KAFKA_TOPIC_NUM_PARTITIONS?: string;
  KAFKA_TOPIC_REPLICATION_FACTOR?: string;
  KAFKA_TOPIC_MIN_INSYNC_REPLICAS?: string;
  [key: string]: string | undefined;
};

type EnsureTopicsOptions = {
  timeout?: number;
  waitForLeaders?: boolean;
};

export type KafkaTopicDefaults = {
  numPartitions: number;
  replicationFactor: number;
  minInSyncReplicas: number;
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer when provided.`);
  }

  return parsed;
};

export const readKafkaTopicDefaults = (
  env: KafkaTopicEnv = process.env,
): KafkaTopicDefaults => {
  const replicationFactor = parsePositiveInteger(
    env.KAFKA_TOPIC_REPLICATION_FACTOR,
    3,
    "KAFKA_TOPIC_REPLICATION_FACTOR",
  );
  const minInSyncReplicas = parsePositiveInteger(
    env.KAFKA_TOPIC_MIN_INSYNC_REPLICAS,
    replicationFactor >= 3 ? 2 : 1,
    "KAFKA_TOPIC_MIN_INSYNC_REPLICAS",
  );
  const numPartitions = parsePositiveInteger(
    env.KAFKA_TOPIC_NUM_PARTITIONS,
    3,
    "KAFKA_TOPIC_NUM_PARTITIONS",
  );

  if (minInSyncReplicas > replicationFactor) {
    throw new Error(
      "KAFKA_TOPIC_MIN_INSYNC_REPLICAS cannot exceed KAFKA_TOPIC_REPLICATION_FACTOR.",
    );
  }

  return {
    numPartitions,
    replicationFactor,
    minInSyncReplicas,
  };
};

export const buildTopicConfigs = (
  topics: Array<TopicName | string>,
  defaults: KafkaTopicDefaults,
): Array<ITopicConfig> => {
  const uniqueTopics = [...new Set(topics)].filter(Boolean);

  return uniqueTopics.map((topic) => ({
    topic,
    numPartitions: defaults.numPartitions,
    replicationFactor: defaults.replicationFactor,
    configEntries: [
      {
        name: "min.insync.replicas",
        value: String(defaults.minInSyncReplicas),
      },
      {
        name: "compression.type",
        value: "producer",
      },
    ],
  }));
};

export const ensureTopics = async (
  kafka: Kafka,
  topics: Array<TopicName | string>,
  options: EnsureTopicsOptions = {},
): Promise<boolean> => {
  const uniqueTopics = [...new Set(topics)].filter(Boolean);

  if (uniqueTopics.length === 0) {
    return false;
  }

  const admin = kafka.admin();

  await admin.connect();

  try {
    const defaults = readKafkaTopicDefaults();
    const { brokers } = await admin.describeCluster();

    if (brokers.length < defaults.replicationFactor) {
      throw new Error(
        `Kafka cluster has ${brokers.length} broker(s), but topic creation requires replication factor ${defaults.replicationFactor}.`,
      );
    }

    const existingTopics = new Set(await admin.listTopics());
    const missingTopics = uniqueTopics.filter(
      (topic) => !existingTopics.has(topic),
    );

    if (missingTopics.length === 0) {
      return false;
    }

    const topicConfigs = buildTopicConfigs(missingTopics, defaults);

    return await admin.createTopics({
      topics: topicConfigs,
      waitForLeaders: options.waitForLeaders ?? true,
      timeout: options.timeout ?? 10000,
    });
  } finally {
    await admin.disconnect();
  }
};
