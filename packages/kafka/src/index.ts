export {
  buildTopicConfigs,
  ensureTopics,
  type KafkaTopicDefaults,
  readKafkaTopicDefaults,
} from "./admin";
export {
  createKafkaClient,
  type KafkaClient,
  readKafkaBrokers,
} from "./client";
export {
  createConsumer,
  KafkaConsumer,
  type TopicHandler,
} from "./consumer";
export {
  attachKafkaInstrumentation,
  type KafkaEventClient,
  type KafkaInstrumentationEvent,
  type KafkaInstrumentationLogger,
  type KafkaInstrumentationOptions,
} from "./instrumentation";
export { createProducer, KafkaProducer } from "./topic-producer";
export {
  type PaymentSuccessfulMessage,
  type ProductCreatedMessage,
  type ProductDeletedMessage,
  Topics,
} from "./types";
