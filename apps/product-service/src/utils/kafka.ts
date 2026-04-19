import {
  createKafkaClient,
  ensureTopics,
  type KafkaClient,
  KafkaConsumer,
  KafkaProducer,
  Topics,
} from "@repo/kafka";

export const kafkaClient: KafkaClient = createKafkaClient("product-service");

export const ensureProductKafkaTopics = async () =>
  ensureTopics(kafkaClient, [Topics.PRODUCT_CREATED, Topics.PRODUCT_DELETED]);

export const producer = new KafkaProducer(kafkaClient);
const _consumer = new KafkaConsumer(kafkaClient, "product-group");
