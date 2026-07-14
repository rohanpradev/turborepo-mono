import type {
  Kafka,
  Message,
  Producer,
  ProducerBatch,
  ProducerRecord,
  TopicMessages,
} from "kafkajs";
import { Partitioners } from "kafkajs";
import {
  attachKafkaInstrumentation,
  createKafkaTelemetryHeaders,
  getTraceIdFromTraceparent,
  type KafkaEventClient,
} from "./instrumentation";
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
  private removeInstrumentation: (() => void) | null = null;

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
      this.removeInstrumentation?.();
      this.removeInstrumentation = null;
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
    const startedAt = performance.now();
    const headers = createKafkaTelemetryHeaders(options.headers);

    try {
      const payload: ProducerRecord = {
        topic,
        messages: [
          {
            key: options.key,
            value: JSON.stringify(message),
            headers,
          },
        ],
      };

      await this.producer.send(payload);
      this.logMessageTelemetry("messaging.kafka.produce", {
        durationMs: performance.now() - startedAt,
        messageCount: 1,
        operationName: "send",
        operationType: "send",
        topic,
        traceparent: headers.traceparent,
      });
    } catch (error) {
      console.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }

  public async sendBatch(messages: Array<TopicEnvelope>): Promise<void> {
    const startedAt = performance.now();
    let firstTraceparent: string | undefined;

    try {
      const topicMessages: Array<TopicMessages> = messages.reduce(
        (acc, { topic, message, key, headers }) => {
          const existing = acc.find((tm) => tm.topic === topic);
          const telemetryHeaders = createKafkaTelemetryHeaders(headers);
          firstTraceparent ??= telemetryHeaders.traceparent;
          const kafkaMessage: Message = {
            key,
            value: JSON.stringify(message),
            headers: telemetryHeaders,
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
      this.logMessageTelemetry("messaging.kafka.produce_batch", {
        durationMs: performance.now() - startedAt,
        messageCount: messages.length,
        operationName: "send",
        operationType: "send",
        topic: "batch",
        traceparent: firstTraceparent,
      });
    } catch (error) {
      console.error("Error sending batch messages:", error);
      throw error;
    }
  }

  private createProducer(): Producer {
    const producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      createPartitioner: Partitioners.DefaultPartitioner,
      idempotent: true,
    });

    this.removeInstrumentation = attachKafkaInstrumentation(
      producer as unknown as KafkaEventClient,
      {
        clientId: "producer",
        clientType: "producer",
      },
    );

    return producer;
  }

  private logMessageTelemetry(
    event: string,
    input: {
      durationMs: number;
      messageCount: number;
      operationName: "send";
      operationType: "send";
      topic: string;
      traceparent?: string;
    },
  ) {
    console.info(
      JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        traceId: getTraceIdFromTraceparent(input.traceparent),
        attributes: {
          "messaging.batch.message_count": input.messageCount,
          "messaging.destination.name": input.topic,
          "messaging.operation.name": input.operationName,
          "messaging.operation.type": input.operationType,
          "messaging.system": "kafka",
        },
        measurements: {
          "messaging.client.operation.duration_ms": Number(
            input.durationMs.toFixed(2),
          ),
        },
      }),
    );
  }
}

export const createProducer = (kafka: Kafka): KafkaProducer => {
  return new KafkaProducer(kafka);
};
