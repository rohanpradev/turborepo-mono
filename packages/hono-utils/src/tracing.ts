import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { requestId } from "hono/request-id";
export type ServiceTelemetryVariables = {
  requestId?: string;
  traceId?: string;
  traceparent?: string;
  tracestate?: string;
};

const generateRequestId = () => {
  const bunRuntime = globalThis as typeof globalThis & {
    Bun?: {
      randomUUIDv7?: () => string;
    };
  };

  return typeof bunRuntime.Bun?.randomUUIDv7 === "function"
    ? bunRuntime.Bun.randomUUIDv7()
    : crypto.randomUUID();
};

const normalizeRequestId = (value?: string | null) => {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > 255) {
    return null;
  }

  return trimmed;
};

const traceparentPattern =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export type TraceContext = {
  version: string;
  traceId: string;
  parentId: string;
  traceFlags: string;
};

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

export const createTraceId = () => createNonZeroRandomHex(16);

export const createSpanId = () => createNonZeroRandomHex(8);

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

const telemetryContext = (c: Context) =>
  c as Context<{ Variables: ServiceTelemetryVariables }>;

export const getTraceId = (c: Context) =>
  telemetryContext(c).get("traceId") ??
  parseTraceparent(c.req.header("traceparent"))?.traceId;

export const getTraceparent = (c: Context) =>
  telemetryContext(c).get("traceparent") ??
  c.res.headers.get("traceparent") ??
  c.req.header("traceparent") ??
  undefined;

export const getTelemetryHeaders = (c: Context) => {
  const headers: Record<string, string> = {};
  const requestId = getRequestId(c);
  const traceparent = getTraceparent(c);
  const tracestate =
    telemetryContext(c).get("tracestate") ?? c.req.header("tracestate");

  if (requestId) {
    headers["x-request-id"] = requestId;
  }

  if (traceparent) {
    headers.traceparent = traceparent;
  }

  if (tracestate) {
    headers.tracestate = tracestate;
  }

  return headers;
};

export const getRequestId = (c: Context) =>
  normalizeRequestId(
    (c as Context<{ Variables: { requestId?: string } }>).get("requestId"),
  ) ??
  normalizeRequestId(c.res.headers.get("x-request-id")) ??
  normalizeRequestId(c.req.header("x-request-id"));

export const createRequestIdMiddleware = () =>
  requestId({
    generator: generateRequestId,
    headerName: "X-Request-Id",
    limitLength: 255,
  });

export const createTraceContextMiddleware = () =>
  createMiddleware(async (c, next) => {
    const incomingTrace = parseTraceparent(c.req.header("traceparent"));
    const traceId = incomingTrace?.traceId ?? createTraceId();
    const traceparent = createTraceparent(traceId);
    const tracestate = incomingTrace ? c.req.header("tracestate")?.trim() : "";
    const context = telemetryContext(c);

    context.set("traceId", traceId);
    context.set("traceparent", traceparent);

    if (tracestate) {
      context.set("tracestate", tracestate);
    }

    c.header("Traceparent", traceparent);
    c.header("X-Trace-Id", traceId);

    await next();
  });
