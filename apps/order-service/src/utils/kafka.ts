import {
  createKafkaClient,
  ensureTopics,
  KafkaConsumer,
  KafkaProducer,
  Topics,
} from "@repo/kafka";

export const kafkaClient = createKafkaClient("order-service");

export const ensureOrderKafkaTopics = async () =>
  ensureTopics(kafkaClient, [Topics.PAYMENT_SUCCESSFUL]);

export const producer = new KafkaProducer(kafkaClient);
export const consumer = new KafkaConsumer(kafkaClient, "order-group");
