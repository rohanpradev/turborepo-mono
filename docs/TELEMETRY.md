# Telemetry

The platform emits dependency-light telemetry that works in local Docker logs, Kubernetes logs, and future OpenTelemetry collector pipelines.

## Signals

- Every Hono service accepts and emits W3C `traceparent` headers.
- Responses include `Traceparent`, `X-Trace-Id`, and `X-Request-Id`.
- Error payloads include `traceId` and `requestId` when available.
- HTTP request logs are structured JSON by default and use OpenTelemetry semantic attribute names such as `http.request.method`, `http.response.status_code`, `url.path`, and `user_agent.original`.
- Kafka producers add a `traceparent` message header when one is not already present.
- Kafka producers and consumers emit structured JSON events for send and receive duration, topic, partition, offset, message count, and trace ID.
- The payment service forwards request and trace headers when it calls the product service during checkout catalog validation.

## Runtime Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `TELEMETRY_ENABLED` | `true` | Set to `false` to disable structured telemetry logs. |
| `TELEMETRY_LOG_FORMAT` | `json` | Use `json` for log collectors or `pretty` for object logging during local debugging. |

These variables are runtime-only and are listed in Turborepo `globalPassThroughEnv`, so changing them does not invalidate build artifacts.

## Log Examples

HTTP service request:

```json
{
  "event": "http.server.request",
  "service": "Payment Service API",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "attributes": {
    "http.request.method": "POST",
    "http.response.status_code": 200,
    "url.path": "/rpc/payment/checkout.createSession"
  },
  "measurements": {
    "http.server.request.duration_ms": 42.14
  }
}
```

Kafka receive:

```json
{
  "event": "messaging.kafka.consume",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "attributes": {
    "messaging.system": "kafka",
    "messaging.destination.name": "payment.successful",
    "messaging.kafka.destination.partition": 0,
    "messaging.kafka.message.offset": "12"
  },
  "measurements": {
    "messaging.process.duration_ms": 7.39
  }
}
```

## Local Checks

After starting a service, verify trace propagation with:

```bash
curl -i \
  -H 'traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' \
  http://localhost:8002/health
```

The response should include the same trace ID in `Traceparent` and `X-Trace-Id`, and the service log should include a matching `traceId`.

## Future Collector Profile

The current implementation produces correlated, OpenTelemetry-shaped logs without requiring a collector. The next production-grade step is a Compose and Helm observability profile with an OpenTelemetry Collector, trace backend, and dashboards for request rate, errors, latency, Kafka consumer lag, and dependency readiness.

## References

- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- W3C Trace Context: https://www.w3.org/TR/trace-context/
