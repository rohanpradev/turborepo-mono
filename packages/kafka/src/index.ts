export { createKafkaClient } from "./client";
export { ensureTopics } from "./admin";
export {
  createConsumer,
  KafkaConsumer,
  type TopicHandler,
} from "./consumer";
export { createProducer, KafkaProducer } from "./topic-producer";
export {
  type PaymentSuccessfulMessage,
  type ProductCreatedMessage,
  type ProductDeletedMessage,
  Topics,
} from "./types";
