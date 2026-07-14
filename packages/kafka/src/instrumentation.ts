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

export type KafkaTelemetryHeaders = Record<string, string>;

export type TraceContext = {
  version: string;
  traceId: string;
  parentId: string;
  traceFlags: string;
};

const traceparentPattern =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

const textDecoder = new TextDecoder();

const isZeroHex = (value: string) => /^0+$/.test(value);

const createRandomHex = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createNonZeroRandomHex = (byteLength: number) => {
  let value = createRandomHex(byteLength);

  while (isZeroHex(value)) {
    value = createRandomHex(byteLength);
  }

  return value;
};

const createTraceId = () => createNonZeroRandomHex(16);

const createSpanId = () => createNonZeroRandomHex(8);

const normalizeTraceId = (traceId: string) =>
  /^[0-9a-f]{32}$/.test(traceId) && !isZeroHex(traceId)
    ? traceId
    : createTraceId();

export const parseTraceparent = (
  value?: string | null,
): TraceContext | null => {
  const match = value?.trim().toLowerCase().match(traceparentPattern);

  if (!match) {
    return null;
  }

  const version = match[1];
  const traceId = match[2];
  const parentId = match[3];
  const traceFlags = match[4];

  if (
    !version ||
    version === "ff" ||
    !traceId ||
    !parentId ||
    !traceFlags ||
    isZeroHex(traceId) ||
    isZeroHex(parentId)
  ) {
    return null;
  }

  return {
    version,
    traceId,
    parentId,
    traceFlags,
  };
};

export const createTraceparent = (traceId = createTraceId()) =>
  `00-${normalizeTraceId(traceId)}-${createSpanId()}-01`;

export const getTraceIdFromTraceparent = (value?: string | null) =>
  parseTraceparent(value)?.traceId;

const headerValueToString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Uint8Array) {
    return textDecoder.decode(value);
  }

  if (Array.isArray(value)) {
    return headerValueToString(value[0]);
  }

  return undefined;
};

export const readKafkaHeader = (
  headers: Record<string, unknown> | undefined,
  key: string,
) =>
  headerValueToString(headers?.[key]) ??
  headerValueToString(headers?.[key.toLowerCase()]) ??
  headerValueToString(headers?.[key.toUpperCase()]);

export const createKafkaTelemetryHeaders = (
  headers: KafkaTelemetryHeaders = {},
): KafkaTelemetryHeaders => {
  const trace = parseTraceparent(headers.traceparent);

  return {
    ...headers,
    traceparent: createTraceparent(trace?.traceId),
  };
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
