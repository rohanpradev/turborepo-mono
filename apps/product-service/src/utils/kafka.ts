import {
  createKafkaClient,
  ensureTopics,
  KafkaConsumer,
  KafkaProducer,
  Topics,
} from "@repo/kafka";

export const kafkaClient = createKafkaClient("product-service");

export const ensureProductKafkaTopics = async () =>
  ensureTopics(kafkaClient, [Topics.PRODUCT_CREATED, Topics.PRODUCT_DELETED]);

export const producer = new KafkaProducer(kafkaClient);
export const consumer = new KafkaConsumer(kafkaClient, "product-group");
