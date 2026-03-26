import { Kafka } from "kafkajs";

export const createKafkaClient = (service: string) => {
  const brokers = (
    process.env.KAFKA_BROKERS || "localhost:9094,localhost:9095,localhost:9096"
  )
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must include at least one broker.");
  }

  return new Kafka({
    clientId: service,
    brokers,
    connectionTimeout: 3000,
    requestTimeout: 25000,
    retry: {
      retries: 8,
      initialRetryTime: 100,
      maxRetryTime: 30000,
    },
  });
};
