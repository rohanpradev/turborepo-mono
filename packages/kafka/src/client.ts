import { Kafka, logLevel } from "kafkajs";

export type KafkaClient = Kafka;

type KafkaEnv = {
  KAFKA_BROKERS?: string;
  DOCKER_KAFKA_BROKERS?: string;
  KAFKA_CONNECTION_TIMEOUT_MS?: string;
  KAFKA_REQUEST_TIMEOUT_MS?: string;
  KAFKA_LOG_LEVEL?: string;
  [key: string]: string | undefined;
};

const DEFAULT_BROKERS = "localhost:9094,localhost:9095,localhost:9096";

const parseInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer when provided.`);
  }

  return parsed;
};

const parseLogLevel = (value: string | undefined) => {
  switch (value?.toLowerCase()) {
    case "nothing":
      return logLevel.NOTHING;
    case "error":
      return logLevel.ERROR;
    case "warn":
      return logLevel.WARN;
    case "info":
      return logLevel.INFO;
    case "debug":
      return logLevel.DEBUG;
    default:
      return logLevel.ERROR;
  }
};

export const readKafkaBrokers = (
  env: KafkaEnv = process.env,
): Array<string> => {
  const brokers = (
    env.KAFKA_BROKERS ??
    env.DOCKER_KAFKA_BROKERS ??
    DEFAULT_BROKERS
  )
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must include at least one broker.");
  }

  return brokers;
};

export const createKafkaClient = (
  service: string,
  env: KafkaEnv = process.env,
): KafkaClient => {
  const brokers = readKafkaBrokers(env);

  return new Kafka({
    clientId: service,
    brokers,
    connectionTimeout: parseInteger(
      env.KAFKA_CONNECTION_TIMEOUT_MS,
      3000,
      "KAFKA_CONNECTION_TIMEOUT_MS",
    ),
    requestTimeout: parseInteger(
      env.KAFKA_REQUEST_TIMEOUT_MS,
      25000,
      "KAFKA_REQUEST_TIMEOUT_MS",
    ),
    logLevel: parseLogLevel(env.KAFKA_LOG_LEVEL),
    retry: {
      retries: 8,
      initialRetryTime: 100,
      maxRetryTime: 30000,
    },
  });
};
