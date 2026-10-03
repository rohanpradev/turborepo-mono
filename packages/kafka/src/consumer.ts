import type { Consumer, Kafka, Producer } from "kafkajs";
import { ensureTopics } from "./admin";
import {
  attachKafkaInstrumentation,
  type KafkaEventClient,
  readKafkaHeader,
  withKafkaTrace,
} from "./instrumentation";
import { validateTopicMessage } from "./schemas";
import type { MessageForTopic, TopicName } from "./types";

export type MessageContext = {
  topic: string;
  partition: number;
  offset: string;
  traceparent?: string;
};
export interface TopicHandler<T extends TopicName = TopicName> {
  topicName: T;
  topicHandler: (
    message: MessageForTopic<T>,
    context?: MessageContext,
  ) => Promise<void>;
}
export type AnyTopicHandler = { [T in TopicName]: TopicHandler<T> }[TopicName];

export class KafkaConsumer {
  private consumer: Consumer;
  private deadLetterProducer: Producer;
  private started = false;
  private startPromise: Promise<void> | undefined;
  private healthy = false;
  private quarantined = new Map<string, number>();
  metrics() {
    return [...this.quarantined]
      .map(
        ([topic, count]) =>
          `ecommerce_kafka_quarantined_total{group=${JSON.stringify(this.groupId)},topic=${JSON.stringify(topic)}} ${count}\n`,
      )
      .join("");
  }
  private removeInstrumentation: (() => void) | undefined;
  private removeCrash: (() => void) | undefined;
  private removeJoin: (() => void) | undefined;
  constructor(
    private kafka: Kafka,
    private groupId: string,
  ) {
    this.consumer = kafka.consumer({
      groupId,
      allowAutoTopicCreation: false,
      sessionTimeout: 30000,
      retry: { restartOnFailure: async () => true },
    });
    this.deadLetterProducer = kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true,
    });
  }
  isReady() {
    return this.healthy;
  }
  async start(
    topics: AnyTopicHandler[],
    options: { fromBeginning?: boolean } = {},
  ) {
    if (this.started) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.connect(topics, options).finally(() => {
      this.startPromise = undefined;
    });
    return this.startPromise;
  }
  private async connect(
    topics: AnyTopicHandler[],
    options: { fromBeginning?: boolean },
  ) {
    this.removeInstrumentation = attachKafkaInstrumentation(
      this.consumer as unknown as KafkaEventClient,
      { clientId: this.groupId, clientType: "consumer" },
    );
    this.removeCrash = this.consumer.on(this.consumer.events.CRASH, () => {
      this.healthy = false;
    });
    this.removeJoin = this.consumer.on(this.consumer.events.GROUP_JOIN, () => {
      this.healthy = true;
    });
    for (const subscription of topics)
      if (!this.quarantined.has(subscription.topicName))
        this.quarantined.set(subscription.topicName, 0);
    const handlers = new Map(
      topics.map(({ topicName, topicHandler }) => [
        topicName,
        topicHandler as (
          message: unknown,
          context: MessageContext,
        ) => Promise<void>,
      ]),
    );
    try {
      await ensureTopics(
        this.kafka,
        topics.map((t) => `${t.topicName}.${this.groupId}.dead-letter`),
      );
      await this.deadLetterProducer.connect();
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: topics.map((t) => t.topicName),
        fromBeginning: options.fromBeginning ?? true,
      });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          const context = {
            topic,
            partition,
            offset: message.offset,
            traceparent: readKafkaHeader(message.headers, "traceparent"),
          };
          const handler = handlers.get(topic as TopicName);
          if (!handler) throw new Error("No handler registered.");
          const version = readKafkaHeader(message.headers, "schema-version");
          let payload: unknown;
          let failure: unknown;
          try {
            if (version && version !== "1")
              throw new Error("Unsupported event schema version.");
            payload = validateTopicMessage(
              topic as TopicName,
              JSON.parse(message.value?.toString() ?? "null"),
            );
          } catch (error) {
            failure = error;
          }
          if (!failure) {
            for (let attempt = 0; attempt < 5; attempt++) {
              let heartbeatFailure: unknown;
              let beating = false;
              const timer = setInterval(() => {
                if (beating) return;
                beating = true;
                void heartbeat()
                  .catch((error) => {
                    heartbeatFailure = error;
                  })
                  .finally(() => {
                    beating = false;
                  });
              }, 2000);
              try {
                await withKafkaTrace(context.traceparent, () =>
                  handler(payload, context),
                );
                if (heartbeatFailure) throw heartbeatFailure;
                this.healthy = true;
                return;
              } catch (error) {
                failure = error;
              } finally {
                clearInterval(timer);
              }
              await heartbeat();
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  Math.min(4000, 250 * 2 ** attempt) + Math.random() * 100,
                ),
              );
            }
          }
          // The source offset may advance only after Kafka accepts quarantine.
          await this.deadLetterProducer.send({
            topic: `${topic}.${this.groupId}.dead-letter`,
            messages: [
              {
                key: `${topic}:${partition}:${message.offset}`,
                value: JSON.stringify({
                  source: context,
                  groupId: this.groupId,
                  key: message.key?.toString("base64") ?? null,
                  value: message.value?.toString("base64") ?? null,
                  headers: Object.fromEntries(
                    Object.entries(message.headers ?? {}).map(
                      ([key, value]) => [
                        key,
                        Array.isArray(value)
                          ? value.map((v) => Buffer.from(v).toString("base64"))
                          : value === undefined
                            ? null
                            : Buffer.from(value).toString("base64"),
                      ],
                    ),
                  ),
                  errorType:
                    failure instanceof Error ? failure.name : "ProcessingError",
                  quarantinedAt: new Date().toISOString(),
                }),
              },
            ],
          });
          this.quarantined.set(topic, (this.quarantined.get(topic) ?? 0) + 1);
          console.error("Kafka message quarantined", {
            topic,
            partition,
            offset: message.offset,
            groupId: this.groupId,
          });
        },
      });
      this.started = true;
    } catch (error) {
      this.healthy = false;
      await Promise.allSettled([
        this.consumer.disconnect(),
        this.deadLetterProducer.disconnect(),
      ]);
      this.removeInstrumentation?.();
      this.removeCrash?.();
      this.removeJoin?.();
      throw error;
    }
  }
  async startBatch(
    topics: AnyTopicHandler[],
    options: { fromBeginning?: boolean } = {},
  ) {
    return this.start(topics, options);
  }
  async shutdown() {
    await this.startPromise?.catch(() => {});
    this.healthy = false;
    await Promise.allSettled([
      this.consumer.disconnect(),
      this.deadLetterProducer.disconnect(),
    ]);
    this.removeInstrumentation?.();
    this.removeCrash?.();
    this.removeJoin?.();
    this.started = false;
  }
}
export const createConsumer = (kafka: Kafka, groupId: string) =>
  new KafkaConsumer(kafka, groupId);
