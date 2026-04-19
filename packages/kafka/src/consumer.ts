import type {
  Consumer,
  ConsumerSubscribeTopics,
  EachBatchPayload,
  EachMessagePayload,
  Kafka,
} from "kafkajs";
import type { MessageForTopic, TopicName } from "./types";

export interface TopicHandler<TTopic extends TopicName = TopicName> {
  topicName: TTopic;
  topicHandler: (message: MessageForTopic<TTopic>) => Promise<void>;
}

export type AnyTopicHandler = {
  [TTopic in TopicName]: TopicHandler<TTopic>;
}[TopicName];

export class KafkaConsumer {
  private kafkaConsumer: Consumer;
  private handlers: Map<string, (message: unknown) => Promise<void>> =
    new Map();
  private started = false;

  constructor(
    private kafka: Kafka,
    private groupId: string,
  ) {
    this.kafkaConsumer = this.createKafkaConsumer();
  }

  public async start(
    topics: Array<AnyTopicHandler>,
    options: {
      fromBeginning?: boolean;
    } = {},
  ): Promise<void> {
    if (this.started) {
      return;
    }

    // Store handlers
    topics.forEach(({ topicName, topicHandler }) => {
      this.handlers.set(
        topicName,
        topicHandler as (message: unknown) => Promise<void>,
      );
    });

    const subscribeTopics: ConsumerSubscribeTopics = {
      topics: topics.map((t) => t.topicName),
      fromBeginning: options.fromBeginning ?? false,
    };

    try {
      await this.kafkaConsumer.connect();
      console.log(`Kafka consumer connected: ${this.groupId}`);

      await this.kafkaConsumer.subscribe(subscribeTopics);

      await this.kafkaConsumer.run({
        eachMessage: async (messagePayload: EachMessagePayload) => {
          const { topic, partition, message } = messagePayload;
          const prefix = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`;

          try {
            const handler = this.handlers.get(topic);
            if (handler) {
              const value = message.value?.toString();
              if (value) {
                const parsedMessage = JSON.parse(value);
                await handler(parsedMessage);
                console.log(`- ${prefix} processed successfully`);
              }
            } else {
              console.warn(`No handler found for topic: ${topic}`);
            }
          } catch (error) {
            console.error(`Error processing message ${prefix}:`, error);
            throw error;
          }
        },
      });
      this.started = true;
    } catch (error) {
      console.error("Error in consumer:", error);
      throw error;
    }
  }

  public async startBatch(
    topics: Array<AnyTopicHandler>,
    options: {
      fromBeginning?: boolean;
    } = {},
  ): Promise<void> {
    if (this.started) {
      return;
    }

    // Store handlers
    topics.forEach(({ topicName, topicHandler }) => {
      this.handlers.set(
        topicName,
        topicHandler as (message: unknown) => Promise<void>,
      );
    });

    const subscribeTopics: ConsumerSubscribeTopics = {
      topics: topics.map((t) => t.topicName),
      fromBeginning: options.fromBeginning ?? false,
    };

    try {
      await this.kafkaConsumer.connect();
      console.log(`Kafka consumer connected: ${this.groupId}`);

      await this.kafkaConsumer.subscribe(subscribeTopics);

      await this.kafkaConsumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async (eachBatchPayload: EachBatchPayload) => {
          const {
            batch,
            commitOffsetsIfNecessary,
            heartbeat,
            isRunning,
            isStale,
            resolveOffset,
          } = eachBatchPayload;
          const handler = this.handlers.get(batch.topic);

          if (!handler) {
            console.warn(`No handler found for topic: ${batch.topic}`);
            return;
          }

          for (const message of batch.messages) {
            if (!isRunning() || isStale()) {
              break;
            }

            const prefix = `${batch.topic}[${batch.partition} | ${message.offset}] / ${message.timestamp}`;
            try {
              const value = message.value?.toString();
              if (value) {
                const parsedMessage = JSON.parse(value);
                await handler(parsedMessage);
                resolveOffset(message.offset);
                await heartbeat();
                console.log(`- ${prefix} processed successfully`);
              }
            } catch (error) {
              console.error(`Error processing message ${prefix}:`, error);
              throw error;
            }
          }

          await commitOffsetsIfNecessary();
        },
      });
      this.started = true;
    } catch (error) {
      console.error("Error in batch consumer:", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.started) {
      return;
    }

    try {
      await this.kafkaConsumer.disconnect();
      this.started = false;
      console.log(`Kafka consumer disconnected: ${this.groupId}`);
    } catch (error) {
      console.error("Error disconnecting the consumer:", error);
      throw error;
    }
  }

  private createKafkaConsumer(): Consumer {
    return this.kafka.consumer({
      groupId: this.groupId,
      allowAutoTopicCreation: false,
    });
  }
}

// Factory function for backward compatibility
export const createConsumer = (
  kafka: Kafka,
  groupId: string,
): KafkaConsumer => {
  return new KafkaConsumer(kafka, groupId);
};
