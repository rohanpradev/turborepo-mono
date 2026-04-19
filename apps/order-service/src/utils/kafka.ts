import {
  createKafkaClient,
  ensureTopics,
  type KafkaClient,
  KafkaConsumer,
  Topics,
} from "@repo/kafka";

export const kafkaClient: KafkaClient = createKafkaClient("order-service");

export const ensureOrderKafkaTopics = async () =>
  ensureTopics(kafkaClient, [Topics.PAYMENT_SUCCESSFUL]);

export const consumer = new KafkaConsumer(kafkaClient, "order-group");
