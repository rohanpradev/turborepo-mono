import type {
  Kafka,
  Message,
  Producer,
  ProducerBatch,
  ProducerRecord,
  TopicMessages,
} from "kafkajs";
import { Partitioners } from "kafkajs";
import type { MessageForTopic, TopicName } from "./types";

type KafkaProducerHeaders = Record<string, string>;

type TopicEnvelope<TTopic extends TopicName = TopicName> = {
  topic: TTopic;
  message: MessageForTopic<TTopic>;
  key?: string;
  headers?: KafkaProducerHeaders;
};

export class KafkaProducer {
  private producer: Producer;
  private started = false;

  constructor(private kafka: Kafka) {
    this.producer = this.createProducer();
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    try {
      await this.producer.connect();
      this.started = true;
    } catch (error) {
      console.error("Error connecting the producer:", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.started) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.started = false;
    } catch (error) {
      console.error("Error disconnecting the producer:", error);
      throw error;
    }
  }

  public async send<TTopic extends TopicName>(
    topic: TTopic,
    message: MessageForTopic<TTopic>,
    options: {
      key?: string;
      headers?: KafkaProducerHeaders;
    } = {},
  ): Promise<void> {
    try {
      const payload: ProducerRecord = {
        topic,
        messages: [
          {
            key: options.key,
            value: JSON.stringify(message),
            headers: options.headers,
          },
        ],
      };

      await this.producer.send(payload);
    } catch (error) {
      console.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }

  public async sendBatch(messages: Array<TopicEnvelope>): Promise<void> {
    try {
      const topicMessages: Array<TopicMessages> = messages.reduce(
        (acc, { topic, message, key, headers }) => {
          const existing = acc.find((tm) => tm.topic === topic);
          const kafkaMessage: Message = {
            key,
            value: JSON.stringify(message),
            headers,
          };

          if (existing) {
            existing.messages.push(kafkaMessage);
          } else {
            acc.push({ topic, messages: [kafkaMessage] });
          }

          return acc;
        },
        [] as Array<TopicMessages>,
      );

      const batch: ProducerBatch = { topicMessages };
      await this.producer.sendBatch(batch);
    } catch (error) {
      console.error("Error sending batch messages:", error);
      throw error;
    }
  }

  private createProducer(): Producer {
    return this.kafka.producer({
      allowAutoTopicCreation: false,
      createPartitioner: Partitioners.DefaultPartitioner,
      idempotent: true,
    });
  }
}

export const createProducer = (kafka: Kafka): KafkaProducer => {
  return new KafkaProducer(kafka);
};
