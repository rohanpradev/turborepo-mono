import type { ITopicConfig, Kafka } from "kafkajs";
import type { TopicName } from "./types";

type EnsureTopicsOptions = {
  timeout?: number;
  waitForLeaders?: boolean;
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
    const existingTopics = new Set(await admin.listTopics());
    const missingTopics = uniqueTopics.filter(
      (topic) => !existingTopics.has(topic),
    );

    if (missingTopics.length === 0) {
      return false;
    }

    const topicConfigs: ITopicConfig[] = missingTopics.map((topic) => ({
      topic,
    }));

    return await admin.createTopics({
      topics: topicConfigs,
      waitForLeaders: options.waitForLeaders ?? true,
      timeout: options.timeout ?? 10000,
    });
  } finally {
    await admin.disconnect();
  }
};
