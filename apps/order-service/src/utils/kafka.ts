import {
  createKafkaClient,
  ensureTopics,
  type KafkaClient,
  KafkaConsumer,
  Topics,
} from "@repo/kafka";

const kafkaClient: KafkaClient = createKafkaClient("order-service");

export const ensureOrderKafkaTopics = async () =>
  ensureTopics(kafkaClient, [Topics.PAYMENT_SUCCESSFUL]);

const consumer = new KafkaConsumer(kafkaClient, "order-group");
