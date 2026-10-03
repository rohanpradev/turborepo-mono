import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { routePath } from "hono/route";
import type { ServiceRuntime, ServiceRuntimeSnapshot } from "./index";
import { getRequestId, getTraceId } from "./tracing";

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

export const getPrometheusMetricsPath = () => {
  const configuredPath = process.env.PROMETHEUS_METRICS_PATH?.trim();

  return configuredPath?.startsWith("/") ? configuredPath : "/metrics";
};

export const arePrometheusMetricsEnabled = () =>
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
