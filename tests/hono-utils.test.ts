import { afterEach, describe, expect, it } from "bun:test";
import {
  createHealthRoutes,
  createPrometheusMetricsPayload,
  createServiceApp,
  createServiceRuntime,
  createTraceparent,
  getClerkAuthenticationErrorMessage,
  getCorsOrigins,
  parseTraceparent,
} from "../packages/hono-utils/src/index";

const originalCorsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
const originalPrometheusMetricsEnabled = process.env.PROMETHEUS_METRICS_ENABLED;
const originalTelemetryEnabled = process.env.TELEMETRY_ENABLED;

afterEach(() => {
  if (originalCorsAllowedOrigins === undefined) {
    delete process.env.CORS_ALLOWED_ORIGINS;
  } else {
    process.env.CORS_ALLOWED_ORIGINS = originalCorsAllowedOrigins;
  }

  if (originalPrometheusMetricsEnabled === undefined) {
    delete process.env.PROMETHEUS_METRICS_ENABLED;
  } else {
    process.env.PROMETHEUS_METRICS_ENABLED = originalPrometheusMetricsEnabled;
  }

  if (originalTelemetryEnabled === undefined) {
    delete process.env.TELEMETRY_ENABLED;
  } else {
    process.env.TELEMETRY_ENABLED = originalTelemetryEnabled;
  }
});

describe("@repo/hono-utils", () => {
  it("reports readiness based on required dependencies only", () => {
    const runtime = createServiceRuntime("payment-service", [
      { name: "kafka.producer" },
      { name: "stripe", required: false },
    ] as const);

    expect(runtime.snapshot()).toMatchObject({
      ready: false,
      dependencies: [
        { name: "kafka.producer", status: "not_ready", required: true },
        { name: "stripe", status: "not_ready", required: false },
      ],
    });

    runtime.markReady("kafka.producer", "Connected");
    runtime.markDisabled("stripe", "Stripe not configured");

    expect(runtime.snapshot()).toMatchObject({
      ready: true,
      dependencies: [
        { name: "kafka.producer", status: "ready", required: true },
        { name: "stripe", status: "disabled", required: false },
      ],
    });
  });

  it("uses configured CORS origins when present", () => {
    process.env.CORS_ALLOWED_ORIGINS =
      "https://shop.localhost, https://admin.localhost ";

    expect(getCorsOrigins()).toEqual([
      "https://shop.localhost",
      "https://admin.localhost",
    ]);
  });

  it("returns actionable Clerk authentication failures", () => {
    expect(
      getClerkAuthenticationErrorMessage("token-invalid-authorized-parties"),
    ).toContain("different storefront origin");
    expect(
      getClerkAuthenticationErrorMessage("session-token-expired"),
    ).toContain("expired");
    expect(getClerkAuthenticationErrorMessage()).toContain(
      "could not be verified",
    );
  });

  it("creates and validates W3C traceparent headers", () => {
    const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
    const traceparent = createTraceparent(traceId);

    expect(parseTraceparent(traceparent)).toMatchObject({
      traceId,
      version: "00",
      traceFlags: "01",
    });
    expect(
      parseTraceparent(
        "00-00000000000000000000000000000000-0000000000000000-01",
      ),
    ).toBeNull();
  });

  it("renders service readiness as Prometheus metrics", () => {
    const runtime = createServiceRuntime("metrics-service", [
      { name: "database" },
    ] as const);

    runtime.markReady("database", "Connected");

    const metrics = createPrometheusMetricsPayload(runtime);

    expect(metrics).toContain(
      'ecommerce_service_ready{app_service="metrics-service"} 1',
    );
    expect(metrics).toContain(
      'ecommerce_service_dependency_ready{app_service="metrics-service",dependency="database",required="true",status="ready"} 1',
    );
  });

  it("uses route templates and collapses arbitrary not-found paths", async () => {
    process.env.TELEMETRY_ENABLED = "false";
    const serviceName = `metrics-cardinality-${crypto.randomUUID()}`;
    const runtime = createServiceRuntime(serviceName, [] as const);
    const app = createServiceApp({
      title: "Metrics cardinality test",
      version: "1.0.0",
      description: "Exercises low-cardinality HTTP metrics.",
      serviceName,
      tags: [],
    });

    app.get("/widgets/:id", (c) => c.text("ok"));
    app.route("/", createHealthRoutes(runtime));

    await app.request("http://metrics.test/widgets/first");
    await app.request("http://metrics.test/widgets/second");

    for (let index = 0; index < 100; index += 1) {
      await app.request(`http://metrics.test/missing-${index}`);
    }

    const metrics = await (
      await app.request("http://metrics.test/metrics")
    ).text();
    const requestCounterLines = metrics
      .split("\n")
      .filter((line) =>
        line.startsWith(
          `ecommerce_http_requests_total{app_service="${serviceName}"`,
        ),
      );

    expect(requestCounterLines).toHaveLength(2);
    expect(metrics).toContain(
      `ecommerce_http_requests_total{app_service="${serviceName}",method="GET",path="/widgets/:id",status_code="200"} 2`,
    );
    expect(metrics).toContain(
      `ecommerce_http_requests_total{app_service="${serviceName}",method="GET",path="/__not_found__",status_code="404"} 100`,
    );
    expect(metrics).not.toContain("missing-0");
  });

  it("caps HTTP metric label sets and aggregates overflow", async () => {
    process.env.TELEMETRY_ENABLED = "false";
    const serviceName = `metrics-cap-${crypto.randomUUID()}`;
    const runtime = createServiceRuntime(serviceName, [] as const);
    const app = createServiceApp({
      title: "Metrics cap test",
      version: "1.0.0",
      description: "Exercises the HTTP metrics label-set cap.",
      serviceName,
      tags: [],
    });

    for (let index = 0; index < 260; index += 1) {
      app.get(`/bounded-${index}`, (c) => c.text("ok"));
    }

    app.route("/", createHealthRoutes(runtime));

    for (let index = 0; index < 260; index += 1) {
      await app.request(`http://metrics.test/bounded-${index}`);
    }

    const metrics = await (
      await app.request("http://metrics.test/metrics")
    ).text();
    const requestCounterLines = metrics
      .split("\n")
      .filter((line) =>
        line.startsWith(
          `ecommerce_http_requests_total{app_service="${serviceName}"`,
        ),
      );

    expect(requestCounterLines).toHaveLength(257);
    expect(metrics).toContain(
      `ecommerce_http_requests_total{app_service="${serviceName}",method="_OTHER",path="/__overflow__",status_code="2xx"} 4`,
    );
  });
});
