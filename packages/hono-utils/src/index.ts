import { clerkMiddleware, getAuth } from "@clerk/hono";
import type { Hook } from "@hono/zod-openapi";
import {
  createRoute,
  extendZodWithOpenApi,
  OpenAPIHono,
  z,
} from "@hono/zod-openapi";
import { type AnyRouter, ORPCError, onError } from "@orpc/server";
import { BodyLimitPlugin, RPCHandler } from "@orpc/server/fetch";
import type { CustomJwtSessionClaims } from "@repo/types";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context, Env } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { routePath } from "hono/route";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import type { ContentfulStatusCode } from "hono/utils/http-status";

extendZodWithOpenApi(z);

type ServiceTag = {
  name: string;
  description: string;
};

type ScalarTheme =
  | "default"
  | "kepler"
  | "alternate"
  | "moon"
  | "purple"
  | "solarized"
  | "bluePlanet"
  | "deepSpace"
  | "saturn"
  | "elysiajs"
  | "fastify"
  | "mars"
  | "laserwave"
  | "none";

type CreateServiceAppOptions = {
  title: string;
  version: string;
  description: string;
  serviceName?: string;
  tags: Array<ServiceTag>;
  theme?: ScalarTheme;
  requestTimeoutMs?: number;
};

type CreateORPCMiddlewareOptions<TRouter extends AnyRouter> = {
  maxBodySize?: number;
  prefix?: `/${string}`;
  router: TRouter;
  context?: (c: Context) => Record<string, unknown>;
};

type CreateClerkServiceAuthOptions = {
  publicPaths?: Array<string>;
};

export type AuthenticatedServiceVariables = {
  userId: string;
};

export type ServiceTelemetryVariables = {
  requestId?: string;
  traceId?: string;
  traceparent?: string;
  tracestate?: string;
};

type ServiceDependencyDefinition<TName extends string = string> = {
  name: TName;
  required?: boolean;
  initialStatus?: ServiceDependencyStatus;
  detail?: string;
};

export type ServiceDependencyStatus = "ready" | "not_ready" | "disabled";

export type ServiceDependencySnapshot = {
  name: string;
  status: ServiceDependencyStatus;
  required: boolean;
  detail?: string;
};

export type ServiceRuntimeSnapshot<TService extends string = string> = {
  service: TService;
  ready: boolean;
  timestamp: string;
  uptimeSeconds: number;
  dependencies: Array<ServiceDependencySnapshot>;
};

export type ServiceRuntime<
  TService extends string = string,
  TDependencyName extends string = string,
> = {
  service: TService;
  snapshot: () => ServiceRuntimeSnapshot<TService>;
  markReady: (name: TDependencyName, detail?: string) => void;
  markNotReady: (name: TDependencyName, detail?: string) => void;
  markDisabled: (name: TDependencyName, detail?: string) => void;
};

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    timestamp: z.string().optional(),
    requestId: z.string().optional(),
    traceId: z.string().optional(),
  })
  .openapi("ErrorResponse");

export const validationIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
    code: z.string(),
  })
  .openapi("ValidationIssue");

export const validationErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    timestamp: z.string().optional(),
    requestId: z.string().optional(),
    traceId: z.string().optional(),
    issues: z.array(validationIssueSchema),
  })
  .openapi("ValidationErrorResponse");

export const messageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi("MessageResponse");

export const serviceDependencySchema = z
  .object({
    name: z.string(),
    status: z.enum(["ready", "not_ready", "disabled"]),
    required: z.boolean(),
    detail: z.string().optional(),
  })
  .openapi("ServiceDependency");

export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(
  schema: T,
) =>
  z.object({
    success: z.literal(true),
    data: schema,
  });

export const createListResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  createSuccessResponseSchema(z.array(schema));

export const createPaginatedListResponseSchema = <T extends z.ZodTypeAny>(
  schema: T,
) =>
  z.object({
    success: z.literal(true),
    data: z.array(schema),
    meta: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().positive(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  });

export const createHealthResponseSchema = (service: string) =>
  z.object({
    status: z.literal("ok"),
    service: z.literal(service),
    timestamp: z.string(),
    ready: z.boolean(),
    uptimeSeconds: z.number().nonnegative(),
    dependencies: z.array(serviceDependencySchema),
  });

export const createReadinessResponseSchema = (service: string) =>
  z.object({
    status: z.enum(["ok", "degraded"]),
    service: z.literal(service),
    timestamp: z.string(),
    ready: z.boolean(),
    uptimeSeconds: z.number().nonnegative(),
    dependencies: z.array(serviceDependencySchema),
  });

export const jsonContent = <T extends z.ZodTypeAny>(schema: T) => ({
  "application/json": {
    schema,
  },
});

export const bearerSecurity = [{ bearerAuth: [] as string[] }];

const defaultCorsOrigins = [
  "http://localhost:3002",
  "http://localhost:3003",
  "https://shop.localhost",
  "https://admin.localhost",
];

const isConfiguredSecret = (value: string | undefined) =>
  Boolean(value && !value.includes("_here"));

const getClerkConfig = () => {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!isConfiguredSecret(publishableKey) || !isConfiguredSecret(secretKey)) {
    return null;
  }

  const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const jwtKey = process.env.CLERK_JWT_KEY?.trim();

  return {
    publishableKey,
    secretKey,
    ...(authorizedParties?.length ? { authorizedParties } : {}),
    ...(jwtKey ? { jwtKey } : {}),
  };
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

const getRequestTimeoutMs = (fallback: number) => {
  const configured = Number(process.env.REQUEST_TIMEOUT_MS);

  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
};

const getAdminUserIds = () =>
  new Set(
    process.env.ADMIN_USER_IDS?.split(",")
      .map((userId) => userId.trim())
      .filter(Boolean) ?? [],
  );

const getSessionRole = (claims?: CustomJwtSessionClaims) =>
  claims?.role ??
  claims?.metadata?.role ??
  claims?.publicMetadata?.role ??
  claims?.public_metadata?.role;

export const getClerkAuthenticationErrorMessage = (reason?: string) => {
  if (reason === "token-invalid-authorized-parties") {
    return "This session was issued for a different storefront origin. Sign out and sign in again.";
  }

  if (reason?.includes("expired")) {
    return "Your session has expired. Sign in again to continue checkout.";
  }

  return "Your checkout session could not be verified. Sign out and sign in again.";
};

const getClerkAuthenticationFailureReason = (
  auth: ReturnType<typeof getAuth>,
) => {
  try {
    const reason = auth.debug().reason;
    return typeof reason === "string" ? reason : undefined;
  } catch {
    return undefined;
  }
};

export const getAuthenticatedUserId = (c: Context) => {
  if (!getClerkConfig()) {
    throw createORPCException(
      503,
      "Clerk auth is not configured for this environment.",
    );
  }

  const auth = getAuth(c);

  if (!auth?.userId) {
    const reason = getClerkAuthenticationFailureReason(auth);

    console.warn("Clerk request authentication failed", {
      hasAuthorizationHeader: Boolean(c.req.header("authorization")),
      reason: reason ?? "unknown",
    });

    throw createORPCException(401, getClerkAuthenticationErrorMessage(reason));
  }

  return auth.userId;
};

export const getAuthenticatedAdminUserId = (c: Context) => {
  const userId = getAuthenticatedUserId(c);
  const auth = getAuth(c);
  const claims = auth?.sessionClaims as CustomJwtSessionClaims | undefined;
  const adminUserIds = getAdminUserIds();

  if (getSessionRole(claims) !== "admin" && !adminUserIds.has(userId)) {
    throw createORPCException(403, "Forbidden");
  }

  return userId;
};

export const getRequestId = (c: Context) =>
  normalizeRequestId(
    (c as Context<{ Variables: { requestId?: string } }>).get("requestId"),
  ) ??
  normalizeRequestId(c.res.headers.get("x-request-id")) ??
  normalizeRequestId(c.req.header("x-request-id"));

export const createErrorPayload = <
  TAdditional extends Record<string, unknown> = Record<string, never>,
>(
  c: Context,
  error: string,
  additional?: TAdditional,
) => ({
  success: false as const,
  error,
  timestamp: new Date().toISOString(),
  requestId: getRequestId(c) ?? undefined,
  traceId: getTraceId(c) ?? undefined,
  ...(additional ?? {}),
});

export const createErrorResponse = <
  TAdditional extends Record<string, unknown> = Record<string, never>,
>(
  c: Context,
  status: number,
  error: string,
  additional?: TAdditional,
) => c.json(createErrorPayload(c, error, additional), status as never);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createHttpException = <
  TAdditional extends Record<string, unknown> = Record<string, never>,
>(
  status: ContentfulStatusCode,
  error: string,
  additional?: TAdditional,
) =>
  new HTTPException(status, {
    message: error,
    cause: additional,
  });

const statusToORPCCode = (status: number) => {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 408) return "TIMEOUT";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "UNPROCESSABLE_CONTENT";
  if (status === 502) return "BAD_GATEWAY";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_SERVER_ERROR";
};

export const createORPCException = <
  TAdditional extends Record<string, unknown> = Record<string, never>,
>(
  status: ContentfulStatusCode,
  message: string,
  data?: TAdditional,
) =>
  new ORPCError(statusToORPCCode(status), {
    data,
    message,
    status,
  });

export const getCorsOrigins = () => {
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length ? configuredOrigins : defaultCorsOrigins;
};

const createValidationHook =
  <E extends Env = Env>(): Hook<unknown, E, string, Response | undefined> =>
  (result, c) => {
    if (result.success) {
      return;
    }

    return createErrorResponse(c, 422, "Validation failed", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code,
      })),
    });
  };

export const createServiceRouter = <E extends Env = Env>() =>
  new OpenAPIHono<E>({
    defaultHook: createValidationHook<E>(),
  });

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

export const createClerkServiceAuth = <
  TVariables extends
    AuthenticatedServiceVariables = AuthenticatedServiceVariables,
>({
  publicPaths = [],
}: CreateClerkServiceAuthOptions = {}) => {
  const isPublicPath = (path: string) => publicPaths.includes(path);

  const clerkAuthMiddleware = createMiddleware(async (c, next) => {
    if (isPublicPath(c.req.path)) {
      await next();
      return;
    }

    const clerkConfig = getClerkConfig();

    if (!clerkConfig) {
      await next();
      return;
    }

    return clerkMiddleware(clerkConfig)(c, next);
  });

  const requireUser = createMiddleware<{ Variables: TVariables }>(
    async (c, next) => {
      if (!getClerkConfig()) {
        throw createHttpException(
          503,
          "Clerk auth is not configured for this environment.",
        );
      }

      const auth = getAuth(c);

      if (!auth?.userId) {
        throw createHttpException(401, "Unauthorized");
      }

      c.set("userId", auth.userId);
      await next();
    },
  );

  const requireAdmin = createMiddleware<{ Variables: TVariables }>(
    async (c, next) => {
      if (!getClerkConfig()) {
        throw createHttpException(
          503,
          "Clerk auth is not configured for this environment.",
        );
      }

      const auth = getAuth(c);

      if (!auth?.userId) {
        throw createHttpException(401, "Unauthorized");
      }

      const claims = auth.sessionClaims as CustomJwtSessionClaims | undefined;
      const adminUserIds = getAdminUserIds();

      if (
        getSessionRole(claims) !== "admin" &&
        !adminUserIds.has(auth.userId)
      ) {
        throw createHttpException(403, "Forbidden");
      }

      c.set("userId", auth.userId);
      await next();
    },
  );

  return {
    clerkAuthMiddleware,
    requireUser,
    requireAdmin,
  };
};

export const createServiceRuntime = <
  TService extends string,
  const TDefinitions extends readonly ServiceDependencyDefinition<string>[],
>(
  service: TService,
  definitions: TDefinitions,
): ServiceRuntime<TService, TDefinitions[number]["name"]> => {
  const startedAt = Date.now();
  const dependencies = new Map(
    definitions.map((definition) => [
      definition.name,
      {
        name: definition.name,
        status: definition.initialStatus ?? "not_ready",
        required: definition.required ?? true,
        detail: definition.detail,
      },
    ]),
  );

  const updateDependency = (
    name: TDefinitions[number]["name"],
    status: ServiceDependencyStatus,
    detail?: string,
  ) => {
    const current = dependencies.get(name);

    if (!current) {
      throw new Error(
        `Unknown dependency "${name}" for service runtime "${service}".`,
      );
    }

    dependencies.set(name, {
      ...current,
      status,
      detail,
    });
  };

  return {
    service,
    snapshot: () => {
      const dependencySnapshots = [...dependencies.values()];

      return {
        service,
        ready: dependencySnapshots.every(
          (dependency) => !dependency.required || dependency.status === "ready",
        ),
        timestamp: new Date().toISOString(),
        uptimeSeconds: (Date.now() - startedAt) / 1000,
        dependencies: dependencySnapshots,
      };
    },
    markReady: (name, detail) => {
      updateDependency(name, "ready", detail);
    },
    markNotReady: (name, detail) => {
      updateDependency(name, "not_ready", detail);
    },
    markDisabled: (name, detail) => {
      updateDependency(name, "disabled", detail);
    },
  };
};

const toSchemaNamePrefix = (service: string) =>
  service
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

export const createHealthRoutes = <
  TDependencyName extends string,
  E extends Env = Env,
>(
  runtime: ServiceRuntime<string, TDependencyName>,
) => {
  const schemaNamePrefix = toSchemaNamePrefix(runtime.service);
  const healthResponseSchema = createHealthResponseSchema(
    runtime.service,
  ).openapi(`${schemaNamePrefix}HealthResponse`);
  const readinessResponseSchema = createReadinessResponseSchema(
    runtime.service,
  ).openapi(`${schemaNamePrefix}ReadinessResponse`);

  const buildHealthPayload = (snapshot: ServiceRuntimeSnapshot) =>
    ({
      status: "ok" as const,
      service: snapshot.service,
      ready: snapshot.ready,
      timestamp: snapshot.timestamp,
      uptimeSeconds: snapshot.uptimeSeconds,
      dependencies: snapshot.dependencies,
    }) satisfies z.infer<typeof healthResponseSchema>;

  const buildReadinessPayload = (snapshot: ServiceRuntimeSnapshot) =>
    ({
      status: snapshot.ready ? ("ok" as const) : ("degraded" as const),
      service: snapshot.service,
      ready: snapshot.ready,
      timestamp: snapshot.timestamp,
      uptimeSeconds: snapshot.uptimeSeconds,
      dependencies: snapshot.dependencies,
    }) satisfies z.infer<typeof readinessResponseSchema>;

  const healthRoute = createRoute({
    method: "get",
    path: "/health",
    tags: ["health"],
    summary: "Health check",
    description: `Returns liveness information for the ${runtime.service}.`,
    responses: {
      200: {
        description: "The service process is responding.",
        content: jsonContent(healthResponseSchema),
      },
    },
  });

  const liveRoute = createRoute({
    method: "get",
    path: "/health/live",
    tags: ["health"],
    summary: "Liveness check",
    description:
      "Returns a liveness probe suitable for containers and load balancers.",
    responses: {
      200: {
        description: "The service process is alive.",
        content: jsonContent(healthResponseSchema),
      },
    },
  });

  const readinessRoute = createRoute({
    method: "get",
    path: "/health/ready",
    tags: ["health"],
    summary: "Readiness check",
    description:
      "Returns readiness for serving traffic, including required dependency state.",
    responses: {
      200: {
        description: "The service is ready to accept traffic.",
        content: jsonContent(readinessResponseSchema),
      },
      503: {
        description: "The service is running but not ready yet.",
        content: jsonContent(readinessResponseSchema),
      },
    },
  });

  return createServiceRouter<E>()
    .openapi(healthRoute, (c) =>
      c.json(buildHealthPayload(runtime.snapshot()), 200),
    )
    .openapi(liveRoute, (c) =>
      c.json(buildHealthPayload(runtime.snapshot()), 200),
    )
    .openapi(readinessRoute, (c) => {
      const snapshot = runtime.snapshot();
      const payload = buildReadinessPayload(snapshot);

      return snapshot.ready ? c.json(payload, 200) : c.json(payload, 503);
    })
    .get(getPrometheusMetricsPath(), (c) => {
      if (!arePrometheusMetricsEnabled()) {
        return createErrorResponse(c, 404, "Prometheus metrics are disabled");
      }

      return c.text(createPrometheusMetricsPayload(runtime), 200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      });
    });
};

export const createCorsMiddleware = () =>
  cors({
    allowHeaders: [
      "Authorization",
      "Baggage",
      "Content-Type",
      "Traceparent",
      "Tracestate",
      "X-Request-Id",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: [
      "Server-Timing",
      "Traceparent",
      "X-Request-Id",
      "X-Trace-Id",
    ],
    maxAge: 600,
    origin: getCorsOrigins(),
    credentials: true,
  });

const compactRecord = (record: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );

const isTelemetryEnabled = () => process.env.TELEMETRY_ENABLED !== "false";

const emitTelemetry = (
  level: "info" | "warn" | "error",
  payload: Record<string, unknown>,
) => {
  if (!isTelemetryEnabled()) {
    return;
  }

  const logPayload =
    process.env.TELEMETRY_LOG_FORMAT === "pretty"
      ? payload
      : JSON.stringify(payload);

  console[level](logPayload);
};

const prometheusDurationBuckets = [
  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10,
];

type HttpMetricLabels = {
  appService: string;
  method: string;
  path: string;
  statusCode: string;
};

type HttpMetricRecord = {
  labels: HttpMetricLabels;
  count: number;
  sumSeconds: number;
  buckets: Array<number>;
};

const MAX_HTTP_METRIC_LABEL_SETS = 256;
const NOT_FOUND_METRIC_PATH = "/__not_found__";
const UNMATCHED_METRIC_PATH = "/__unmatched__";
const OVERFLOW_METRIC_PATH = "/__overflow__";

const normalizeMetricPath = (path: string) =>
  path
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      ":id",
    )
    .replace(/\b[0-9a-f]{24}\b/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");

const getMetricRoutePath = (c: Context, statusCode: number) => {
  const matchedPath = routePath(c, -1).trim();

  if (!matchedPath || matchedPath === "*" || matchedPath === "/*") {
    return statusCode === 404 ? NOT_FOUND_METRIC_PATH : UNMATCHED_METRIC_PATH;
  }

  return normalizeMetricPath(matchedPath);
};

const getStatusCodeClass = (statusCode: number) =>
  Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
    ? `${Math.floor(statusCode / 100)}xx`
    : "_OTHER";

const createHttpMetricRecord = (
  labels: HttpMetricLabels,
): HttpMetricRecord => ({
  labels,
  count: 0,
  sumSeconds: 0,
  buckets: prometheusDurationBuckets.map(() => 0),
});

const prometheusMetricsStores = new Map<string, ServicePrometheusMetrics>();

const escapePrometheusLabelValue = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');

const formatLabels = (labels: Record<string, string>) =>
  `{${Object.entries(labels)
    .map(
      ([key, value]) => `${key}="${escapePrometheusLabelValue(String(value))}"`,
    )
    .join(",")}}`;

const metricLine = (
  name: string,
  labels: Record<string, string>,
  value: number,
) => `${name}${formatLabels(labels)} ${Number.isFinite(value) ? value : 0}`;

const getPrometheusMetricsPath = () => {
  const configuredPath = process.env.PROMETHEUS_METRICS_PATH?.trim();

  return configuredPath?.startsWith("/") ? configuredPath : "/metrics";
};

const arePrometheusMetricsEnabled = () =>
  process.env.PROMETHEUS_METRICS_ENABLED !== "false";

class ServicePrometheusMetrics {
  private readonly httpRecords = new Map<string, HttpMetricRecord>();
  private readonly overflowRecords = new Map<string, HttpMetricRecord>();

  constructor(private readonly appService: string) {}

  recordHttp({
    durationMs,
    method,
    path,
    statusCode,
  }: {
    durationMs: number;
    method: string;
    path: string;
    statusCode: number;
  }) {
    if (!arePrometheusMetricsEnabled()) {
      return;
    }

    const labels: HttpMetricLabels = {
      appService: this.appService,
      method,
      path: normalizeMetricPath(path),
      statusCode: String(statusCode),
    };
    const key = JSON.stringify(labels);
    let record = this.httpRecords.get(key);

    if (!record && this.httpRecords.size < MAX_HTTP_METRIC_LABEL_SETS) {
      record = createHttpMetricRecord(labels);
      this.httpRecords.set(key, record);
    }

    if (!record) {
      const statusCodeClass = getStatusCodeClass(statusCode);
      record = this.overflowRecords.get(statusCodeClass);

      if (!record) {
        record = createHttpMetricRecord({
          appService: this.appService,
          method: "_OTHER",
          path: OVERFLOW_METRIC_PATH,
          statusCode: statusCodeClass,
        });
        this.overflowRecords.set(statusCodeClass, record);
      }
    }

    const durationSeconds = durationMs / 1000;

    record.count += 1;
    record.sumSeconds += durationSeconds;

    prometheusDurationBuckets.forEach((bucket, index) => {
      if (durationSeconds <= bucket) {
        record.buckets[index] = (record.buckets[index] ?? 0) + 1;
      }
    });
  }

  render(snapshot?: ServiceRuntimeSnapshot) {
    const nowSeconds = Date.now() / 1000;
    const httpRecords = [
      ...this.httpRecords.values(),
      ...this.overflowRecords.values(),
    ];
    const lines = [
      "# HELP ecommerce_http_requests_total Total HTTP requests handled by the service.",
      "# TYPE ecommerce_http_requests_total counter",
    ];

    for (const record of httpRecords) {
      const labels = {
        app_service: record.labels.appService,
        method: record.labels.method,
        path: record.labels.path,
        status_code: record.labels.statusCode,
      };

      lines.push(
        metricLine("ecommerce_http_requests_total", labels, record.count),
      );
    }

    lines.push(
      "# HELP ecommerce_http_request_duration_seconds HTTP request duration in seconds.",
      "# TYPE ecommerce_http_request_duration_seconds histogram",
    );

    for (const record of httpRecords) {
      const labels = {
        app_service: record.labels.appService,
        method: record.labels.method,
        path: record.labels.path,
        status_code: record.labels.statusCode,
      };

      prometheusDurationBuckets.forEach((bucket, index) => {
        lines.push(
          metricLine(
            "ecommerce_http_request_duration_seconds_bucket",
            { ...labels, le: String(bucket) },
            record.buckets[index] ?? 0,
          ),
        );
      });
      lines.push(
        metricLine(
          "ecommerce_http_request_duration_seconds_bucket",
          { ...labels, le: "+Inf" },
          record.count,
        ),
        metricLine(
          "ecommerce_http_request_duration_seconds_sum",
          labels,
          Number(record.sumSeconds.toFixed(6)),
        ),
        metricLine(
          "ecommerce_http_request_duration_seconds_count",
          labels,
          record.count,
        ),
      );
    }

    if (snapshot) {
      lines.push(
        "# HELP ecommerce_service_ready Service readiness state from the runtime health model.",
        "# TYPE ecommerce_service_ready gauge",
        metricLine(
          "ecommerce_service_ready",
          { app_service: snapshot.service },
          snapshot.ready ? 1 : 0,
        ),
        "# HELP ecommerce_service_dependency_ready Dependency readiness state from the runtime health model.",
        "# TYPE ecommerce_service_dependency_ready gauge",
      );

      for (const dependency of snapshot.dependencies) {
        lines.push(
          metricLine(
            "ecommerce_service_dependency_ready",
            {
              app_service: snapshot.service,
              dependency: dependency.name,
              required: String(dependency.required),
              status: dependency.status,
            },
            dependency.status === "ready" || dependency.status === "disabled"
              ? 1
              : 0,
          ),
        );
      }
    }

    const memory = process.memoryUsage();

    lines.push(
      "# HELP ecommerce_process_uptime_seconds Process uptime in seconds.",
      "# TYPE ecommerce_process_uptime_seconds gauge",
      metricLine(
        "ecommerce_process_uptime_seconds",
        { app_service: this.appService },
        Number(process.uptime().toFixed(3)),
      ),
      "# HELP ecommerce_process_memory_bytes Process memory usage in bytes.",
      "# TYPE ecommerce_process_memory_bytes gauge",
      metricLine(
        "ecommerce_process_memory_bytes",
        { app_service: this.appService, type: "rss" },
        memory.rss,
      ),
      metricLine(
        "ecommerce_process_memory_bytes",
        { app_service: this.appService, type: "heap_total" },
        memory.heapTotal,
      ),
      metricLine(
        "ecommerce_process_memory_bytes",
        { app_service: this.appService, type: "heap_used" },
        memory.heapUsed,
      ),
      "# HELP ecommerce_metrics_scrape_timestamp_seconds Unix timestamp for this metrics scrape.",
      "# TYPE ecommerce_metrics_scrape_timestamp_seconds gauge",
      metricLine(
        "ecommerce_metrics_scrape_timestamp_seconds",
        { app_service: this.appService },
        Number(nowSeconds.toFixed(3)),
      ),
    );

    return `${lines.join("\n")}\n`;
  }
}

const getServicePrometheusMetrics = (appService: string) => {
  const existing = prometheusMetricsStores.get(appService);

  if (existing) {
    return existing;
  }

  const metrics = new ServicePrometheusMetrics(appService);
  prometheusMetricsStores.set(appService, metrics);
  return metrics;
};

export const createPrometheusMetricsPayload = <TDependencyName extends string>(
  runtime: ServiceRuntime<string, TDependencyName>,
) => getServicePrometheusMetrics(runtime.service).render(runtime.snapshot());

export const createTelemetryMiddleware = (serviceName: string) =>
  createMiddleware(async (c, next) => {
    const startedAt = performance.now();
    let thrownError: unknown;

    try {
      await next();
    } catch (error) {
      thrownError = error;
      throw error;
    } finally {
      const url = new URL(c.req.url);
      const durationMs = Number((performance.now() - startedAt).toFixed(2));
      const statusCode =
        thrownError instanceof HTTPException
          ? thrownError.status
          : thrownError
            ? 500
            : c.res.status;
      const level =
        statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      const metricRoutePath = getMetricRoutePath(c, statusCode);

      if (c.req.path !== getPrometheusMetricsPath()) {
        getServicePrometheusMetrics(serviceName).recordHttp({
          durationMs,
          method: c.req.method,
          path: metricRoutePath,
          statusCode,
        });
      }

      emitTelemetry(level, {
        event: "http.server.request",
        service: serviceName,
        timestamp: new Date().toISOString(),
        requestId: getRequestId(c) ?? undefined,
        traceId: getTraceId(c) ?? undefined,
        attributes: compactRecord({
          "http.request.method": c.req.method,
          "http.route": metricRoutePath,
          "http.response.status_code": statusCode,
          "server.address": url.hostname,
          "server.port": url.port ? Number(url.port) : undefined,
          "url.path": c.req.path,
          "user_agent.original": c.req.header("user-agent"),
          "error.type":
            thrownError instanceof Error
              ? thrownError.name
              : thrownError
                ? "UnknownError"
                : undefined,
        }),
        measurements: {
          "http.server.request.duration_ms": durationMs,
        },
      });
    }
  });

export const createORPCMiddleware = <TRouter extends AnyRouter>({
  context,
  maxBodySize = 1024 * 1024,
  prefix = "/rpc",
  router,
}: CreateORPCMiddlewareOptions<TRouter>) => {
  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        console.error("[oRPC]", error);
      }),
    ],
    plugins: [new BodyLimitPlugin({ maxBodySize })],
  });

  return createMiddleware(async (c, next) => {
    const result = await handler.handle(c.req.raw, {
      context: context?.(c) ?? {},
      prefix,
    });

    if (result.matched) {
      return c.newResponse(result.response.body, result.response);
    }

    await next();
  });
};

export const createServiceApp = <E extends Env = Env>({
  title,
  version,
  description,
  serviceName = title,
  tags,
  theme = "kepler",
  requestTimeoutMs = 30_000,
}: CreateServiceAppOptions) => {
  const app = createServiceRouter<E>();

  app.use("*", createRequestIdMiddleware());
  app.use("*", createTraceContextMiddleware());
  app.use("*", createTelemetryMiddleware(serviceName));
  app.use("*", timing());
  app.use("*", secureHeaders());
  app.use(
    "*",
    timeout(getRequestTimeoutMs(requestTimeoutMs), () =>
      createHttpException(408, "Request timeout"),
    ),
  );
  app.use("*", compress());
  app.notFound((c) => createErrorResponse(c, 404, "Route not found"));
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return createErrorResponse(
        c,
        error.status,
        error.message,
        isRecord(error.cause) ? error.cause : undefined,
      );
    }

    console.error(`[${title}]`, error);

    return createErrorResponse(c, 500, "Internal server error");
  });

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title,
      version,
      description,
    },
    tags,
  });

  app.get(
    "/docs",
    Scalar({
      url: "/openapi.json",
      theme,
      pageTitle: `${title} API Reference`,
    }),
  );

  return app;
};

export { createRoute, OpenAPIHono, z };
