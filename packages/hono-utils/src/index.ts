import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import type { Hook } from "@hono/zod-openapi";
import {
  createRoute,
  extendZodWithOpenApi,
  OpenAPIHono,
  z,
} from "@hono/zod-openapi";
import type { CustomJwtSessionClaims } from "@repo/types";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context, Env } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
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
  tags: Array<ServiceTag>;
  theme?: ScalarTheme;
};

type CreateClerkServiceAuthOptions = {
  publicPaths?: Array<string>;
};

export type AuthenticatedServiceVariables = {
  userId: string;
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
      pageSize: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().positive(),
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

const getClerkConfig = () =>
  (process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  process.env.CLERK_SECRET_KEY
    ? {
        publishableKey:
          process.env.CLERK_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        secretKey: process.env.CLERK_SECRET_KEY,
      }
    : null;

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

export const getRequestId = (c: Context) =>
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
  createMiddleware(async (c, next) => {
    const id =
      normalizeRequestId(c.req.header("x-request-id")) ?? generateRequestId();

    c.header("x-request-id", id);
    await next();
    c.header("x-request-id", id);
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

      if (claims?.metadata?.role !== "admin") {
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
    });
};

export const createCorsMiddleware = () =>
  createMiddleware(async (c, next) =>
    cors({
      origin: getCorsOrigins(),
      credentials: true,
    })(c, next),
  );

export const createServiceApp = <E extends Env = Env>({
  title,
  version,
  description,
  tags,
  theme = "kepler",
}: CreateServiceAppOptions) => {
  const app = createServiceRouter<E>();

  app.use("*", createRequestIdMiddleware());
  app.use("*", secureHeaders());
  app.use("*", logger());
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
