import {
  createKafkaClient,
  ensureTopics,
  type KafkaClient,
  KafkaConsumer,
  KafkaProducer,
  Topics,
} from "@repo/kafka";

export const kafkaClient: KafkaClient = createKafkaClient("payment-service");

export const ensurePaymentKafkaTopics = async () =>
  ensureTopics(kafkaClient, [
    Topics.PRODUCT_CREATED,
    Topics.PRODUCT_DELETED,
    Topics.PAYMENT_SUCCESSFUL,
  ]);

export const producer = new KafkaProducer(kafkaClient);
export const consumer = new KafkaConsumer(kafkaClient, "payment-group");
