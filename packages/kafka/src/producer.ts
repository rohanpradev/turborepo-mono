import type {
  Kafka,
  Message,
  Producer,
  ProducerBatch,
  TopicMessages,
} from "kafkajs";

export class KafkaProducer {
  private producer: Producer;

  constructor(private kafka: Kafka) {
    this.producer = this.createProducer();
  }

  public async start(): Promise<void> {
    try {
      await this.producer.connect();
    } catch (error) {
      console.error("Error connecting the producer:", error);
      // Don't throw error to prevent service crash during Kafka startup
      console.log("Producer will retry connection automatically");
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await this.producer.disconnect();
    } catch (error) {
      console.error("Error disconnecting the producer:", error);
      throw error;
    }
  }

  public async send<T = unknown>(topic: string, message: T): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    } catch (error) {
      console.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }

  public async sendBatch<T = unknown>(
    messages: Array<{ topic: string; message: T }>,
  ): Promise<void> {
    try {
      const topicMessages: Array<TopicMessages> = messages.reduce(
        (acc, { topic, message }) => {
          const existing = acc.find((tm) => tm.topic === topic);
          const kafkaMessage: Message = { value: JSON.stringify(message) };

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
    return this.kafka.producer();
  }
}

// Factory function for backward compatibility
export const createProducer = (kafka: Kafka): KafkaProducer => {
  return new KafkaProducer(kafka);
};
