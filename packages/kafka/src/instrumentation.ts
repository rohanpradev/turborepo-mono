import type { InstrumentationEvent } from "kafkajs";

export type KafkaInstrumentationEvent<T = unknown> = InstrumentationEvent<T>;

export type KafkaEventClient = {
  events: Record<string, string>;
  on: (
    eventName: string,
    listener: (event: KafkaInstrumentationEvent) => void,
  ) => () => void;
};

type KafkaInstrumentationLogger = {
  debug?: (message: string, payload?: Record<string, unknown>) => void;
  info?: (message: string, payload?: Record<string, unknown>) => void;
  warn?: (message: string, payload?: Record<string, unknown>) => void;
  error?: (message: string, payload?: Record<string, unknown>) => void;
};

type KafkaInstrumentationOptions = {
  clientType: "admin" | "consumer" | "producer";
  clientId: string;
  logger?: KafkaInstrumentationLogger;
};

const toErrorPayload = (error: unknown) =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: error.message }
    : { error: String(error) };

const buildPayload = (
  event: KafkaInstrumentationEvent,
  options: KafkaInstrumentationOptions,
) => ({
  clientId: options.clientId,
  clientType: options.clientType,
  eventType: event.type,
  eventId: event.id,
  timestamp: new Date(event.timestamp).toISOString(),
});

export const attachKafkaInstrumentation = (
  client: KafkaEventClient,
  options: KafkaInstrumentationOptions,
) => {
  const logger = options.logger ?? console;
  const removers: Array<() => void> = [];
  const { events } = client;

  const attach = (
    eventName: string | undefined,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    payloadBuilder?: (
      event: KafkaInstrumentationEvent,
    ) => Record<string, unknown>,
  ) => {
    if (!eventName) {
      return;
    }

    removers.push(
      client.on(eventName, (event) => {
        const payload = {
          ...buildPayload(event, options),
          ...(payloadBuilder?.(event) ?? {}),
        };

        (logger[level] ?? logger.info ?? console.log)(message, payload);
      }),
    );
  };

  attach(events.CONNECT, "info", "Kafka client connected");
  attach(events.DISCONNECT, "info", "Kafka client disconnected");
  attach(events.REQUEST_TIMEOUT, "warn", "Kafka request timed out", (event) =>
    typeof event.payload === "object" && event.payload !== null
      ? (event.payload as Record<string, unknown>)
      : {},
  );
  attach(events.REQUEST_QUEUE_SIZE, "debug", "Kafka request queue changed");
  attach(events.CRASH, "error", "Kafka consumer crashed", (event) => {
    const payload =
      typeof event.payload === "object" && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : {};

    return {
      ...payload,
      ...toErrorPayload(payload.error),
    };
  });
  attach(events.REBALANCING, "info", "Kafka consumer group rebalancing");
  attach(events.GROUP_JOIN, "info", "Kafka consumer group joined");

  return () => {
    for (const remove of removers) {
      remove();
    }
  };
};

export type { KafkaInstrumentationLogger, KafkaInstrumentationOptions };
