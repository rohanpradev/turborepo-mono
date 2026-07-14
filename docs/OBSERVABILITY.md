# Observability

This repo uses a Kubernetes-native observability stack:

- Prometheus Operator and kube-prometheus-stack for Prometheus, Alertmanager, Grafana, node metrics, and Kubernetes dashboards.
- `ServiceMonitor` resources for app metrics and Traefik metrics.
- `PrometheusRule` alerts for readiness, 5xx ratio, and p95 latency.
- Grafana dashboard ConfigMaps for app and ingress traffic views.
- Structured service logs and W3C trace IDs from `docs/TELEMETRY.md`.

## Local Kubernetes

Install Prometheus, Grafana, Alertmanager, and the operator:

```bash
make k8s-observability
```

Build and deploy the app with ServiceMonitors, alert rules, dashboards, and Traefik metrics enabled:

```bash
make k8s-up-observed
```

Show the observability resources:

```bash
make k8s-observability-status
```

Open Grafana and Prometheus with port forwarding:

```bash
make k8s-grafana
make k8s-prometheus
```

Default local URLs:

- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`

The kube-prometheus-stack Grafana chart creates the admin credentials. For local clusters, fetch the password with:

```bash
kubectl -n monitoring get secret kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' | base64 --decode
```

## App Metrics

The Hono services expose Prometheus text metrics at `/metrics` when `PROMETHEUS_METRICS_ENABLED` is not `false`.

Metrics include:

- `ecommerce_http_requests_total`
- `ecommerce_http_request_duration_seconds`
- `ecommerce_service_ready`
- `ecommerce_service_dependency_ready`
- `ecommerce_process_uptime_seconds`
- `ecommerce_process_memory_bytes`

Configuration:

```env
PROMETHEUS_METRICS_ENABLED=true
PROMETHEUS_METRICS_PATH=/metrics
```

The Helm chart scrapes the product, order, and payment services by default:

```yaml
observability:
  serviceMonitor:
    enabled: true
    services:
      - product
      - order
      - payment
```

## Traefik Metrics

`make k8s-traefik` installs Traefik with:

- Prometheus metrics enabled.
- EntryPoint, router, and service labels enabled.
- Internal metrics enabled.
- A dedicated metrics service for Prometheus Operator scraping.

The app chart can create a Traefik `ServiceMonitor`:

```yaml
observability:
  traefik:
    namespace: traefik
    serviceMonitor:
      enabled: true
      selector:
        app.kubernetes.io/name: traefik
        app.kubernetes.io/instance: traefik
```

## Production Guidance

For production, keep kube-prometheus-stack separate from the app chart and promote the same app chart values:

```yaml
observability:
  serviceMonitor:
    enabled: true
    labels:
      release: kube-prometheus-stack
  traefik:
    serviceMonitor:
      enabled: true
      labels:
        release: kube-prometheus-stack
  prometheusRule:
    enabled: true
  grafanaDashboard:
    enabled: true
```

Recommended production checks:

- Keep Prometheus selectors explicit if your platform requires tenancy boundaries.
- Keep Grafana dashboard discovery scoped by namespace or labels in shared clusters.
- Tune alert thresholds after collecting baseline traffic.
- Use the app `traceId` logs to jump from a Grafana/Prometheus symptom to request-level logs.

## References

- [Prometheus Operator ServiceMonitor and PodMonitor](https://prometheus-operator.dev/docs/developer/getting-started/)
- [kube-prometheus-stack Helm chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Traefik Prometheus metrics](https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/)
- [Grafana Helm chart dashboard provisioning](https://github.com/grafana/helm-charts/tree/main/charts/grafana)
