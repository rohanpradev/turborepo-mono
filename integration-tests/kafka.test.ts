import { expect, test } from "bun:test";
import {
  createConsumer,
  createKafkaClient,
  ensureTopics,
  Topics,
} from "../packages/kafka/src";

const brokers = process.env.INTEGRATION_KAFKA_BROKERS;
const eventually = async (predicate: () => boolean) => {
  const end = Date.now() + 30000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error("Kafka condition timed out.");
    await Bun.sleep(100);
  }
};
test.skipIf(!brokers)(
  "real Kafka replays retained events, quarantines poison, retries transient errors, and resumes after restart",
  async () => {
    if (
      !brokers
        ?.split(",")
        .every((address) => /^(localhost|127\.0\.0\.1):\d+$/.test(address))
    )
      throw new Error("Use an isolated loopback broker for integration tests.");
    const kafka = createKafkaClient("audit-test", {
      KAFKA_BROKERS: brokers,
      KAFKA_LOG_LEVEL: "nothing",
    });
    const group = `audit-${crypto.randomUUID()}`;
    const topic = Topics.PRODUCT_DELETED;
    const deadLetter = `${topic}.${group}.dead-letter`;
    const consumer = createConsumer(kafka, group);
    const producer = kafka.producer();
    const observer = kafka.consumer({ groupId: `${group}-observer` });
    const ids: string[] = [];
    const quarantined: unknown[] = [];
    let attempts = 0;
    try {
      await ensureTopics(kafka, [topic, deadLetter]);
      await producer.connect();
      const message = { id: group, deletedAt: new Date().toISOString() };
      await producer.send({
        topic,
        messages: [
          { value: "{invalid", partition: 0 },
          { value: JSON.stringify(message), partition: 0 },
        ],
      });
      await observer.connect();
      await observer.subscribe({ topic: deadLetter, fromBeginning: true });
      await observer.run({
        eachMessage: async ({ message }) => {
          quarantined.push(JSON.parse(message.value?.toString() ?? "null"));
        },
      });
      const subscription = {
        topicName: topic,
        topicHandler: async (message: { id: string }) => {
          if (message.id === group && ++attempts < 3)
            throw new Error("transient failure");
          ids.push(message.id);
        },
      };
      await consumer.start([subscription]);
      await eventually(() => ids.includes(group) && quarantined.length > 0);
      expect(attempts).toBe(3);
      expect(quarantined[0]).toMatchObject({
        groupId: group,
        source: { topic, partition: 0 },
      });
      await consumer.shutdown();
      await producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify({ ...message, id: `${group}-after` }),
            partition: 0,
          },
        ],
      });
      await consumer.start([subscription]);
      await eventually(() => ids.includes(`${group}-after`));
      expect(ids.filter((id) => id === group)).toHaveLength(1);
    } finally {
      await Promise.allSettled([
        consumer.shutdown(),
        observer.disconnect(),
        producer.disconnect(),
      ]);
      const admin = kafka.admin();
      await admin.connect();
      try {
        await admin.deleteTopics({ topics: [topic, deadLetter] });
      } finally {
        await admin.disconnect();
      }
    }
  },
  60000,
);
