# Ecommerce Helm Chart

This chart deploys the ecommerce application layer: storefront, admin, product service, order service, payment service, services, ingress, probes, PDBs, optional HPAs, optional network policies, and migration/seed jobs.

Stateful infrastructure is not bundled into this chart. Postgres, MongoDB, Kafka, Clerk, and Stripe are supplied through values and Kubernetes Secrets. That keeps the app chart portable across local clusters, staging, and production.

The web-local profile enables a Stripe CLI sidecar in the payment pod. It forwards test events directly to the payment container and shares the listener-specific `whsec_...` through an in-memory file. Production defaults keep this sidecar disabled; register the public HTTPS webhook in Stripe Workbench and supply that endpoint's signing secret through your secret manager instead.

## Local Workflow

```bash
make k8s
make ks8
make kubernetes
make k8s-traefik-status
make k8s-logs-traefik
make k8s-test
make k8s-status
make k8s-up-observed
make k8s-observability-status
```

`make k8s` is the one-command local Kubernetes setup: it installs or upgrades Traefik, starts Docker-backed Postgres, MongoDB, and Kafka, migrates and seeds the product catalog, builds app images, loads them into kind or minikube when needed, validates the Helm chart, deletes and waits for the existing application namespace, recreates the same namespace, syncs TLS and runtime secrets, deploys the release, waits for rollout, and smoke-tests the routes. This clears old pods, jobs, and other namespaced resources on every run. `make ks8` is kept as a friendly alias for the common typo, and `make kubernetes` does the same thing. Use `make k8s-full` only when Postgres, MongoDB, and Kafka already run inside your cluster. Run `make k8s-test` against the deployed release if you want Helm test coverage.

Each one-command deployment generates an immutable `dev-<UTC timestamp>` image tag and passes it to Helm, so rebuilt images always produce a real rollout. To reproduce or resume a deployment across separate Make invocations, provide the same tag explicitly, for example `make k8s K8S_IMAGE_TAG=dev-my-test`.

Useful lower-level commands:

```bash
make helm-lint
make helm-lint-supported
make helm-validate-supported
make helm-template
make helm-dry-run
make helm-package
make k8s-doctor
make k8s-gateway-api
make k8s-diff
make k8s-deploy
make k8s-load-images
make k8s-wait
make k8s-smoke
make k8s-traefik-status
make k8s-test
make k8s-events
make k8s-logs-traefik
make k8s-logs-client
make k8s-logs-admin
make k8s-logs-product
make k8s-logs-order
make k8s-logs-payment
make k8s-describe K8S_SERVICE=product-service
make k8s-restart
make k8s-uninstall
```

The local workflow installs Traefik as a standard Kubernetes Ingress controller and deploys app routes with `ingressClassName: traefik`.

The deployment toolchain is pinned to Helm 4.2.3, kubeconform 0.8.0, Traefik chart 41.0.2 with the security-fixed Traefik 3.7.9 image digest, kube-prometheus-stack 87.19.1, and Gateway API 1.5.1. Gateway API 1.6.1 is newer upstream, but Traefik 3.7's current provider documentation declares support for 1.5.1, so the installer deliberately keeps that compatibility pin. Chart 0.3.0 supports the actively maintained Kubernetes 1.34, 1.35, and 1.36 release lines. CI lints and strictly schema-validates every chart profile against the latest published patch in each line. CRD-backed resources without Kubernetes-core schemas are skipped by kubeconform and remain covered by Helm rendering and live-cluster validation. The Traefik and kube-prometheus-stack workflows apply their chart CRDs before upgrading the controllers because Helm does not upgrade CRDs automatically.

For Prometheus, Grafana, app metrics, Traefik metrics, and alert rules, run:

```bash
make k8s-up-observed
make k8s-grafana
make k8s-prometheus
```

The observed workflow installs kube-prometheus-stack, enables the Traefik metrics service, and deploys this chart with `ServiceMonitor`, `PrometheusRule`, and Grafana dashboard resources.

Local routes:

- `https://shop.localhost`
- `https://admin.localhost`
- `https://api.localhost`

Docker Compose intentionally uses `https://shop.localhost:8443` so it does not fight Kubernetes for host port 443.

For clusters that use a different Kubernetes Ingress provider, set `K8S_INGRESS_CLASS_NAME=<your-class>` and override `K8S_ROUTE_SET_ARGS` if the chart needs a different `ingress.className`.

## Secrets

The chart references one runtime secret, `ecommerce-runtime` by default. Create it with:

```bash
make k8s-runtime-secret
```

For real environments, prefer your cluster secret manager or External Secrets operator and set `HELM_RUNTIME_SECRET` to the secret name.

## TLS

For local TLS, sync the mkcert certificate:

```bash
make k8s-tls-secret
```

For shared environments, provide a certificate through cert-manager or your ingress platform and set `HELM_TLS_SECRET`.

## Images

The default local image names match the Docker Compose builds:

- `turborepo-monorepo-client`
- `turborepo-monorepo-admin`
- `turborepo-monorepo-product-service`
- `turborepo-monorepo-order-service`
- `turborepo-monorepo-payment-service`

For registries, set `global.imageRegistry` and per-service tags. Every service image also accepts `digest`; when present, Helm renders the traceable `repository:tag@sha256:...` form and Kubernetes uses the immutable digest at runtime. External Stripe CLI and Helm test images are digest-pinned by default.

The admin image optimizer reads storefront product assets over the cluster-internal client Service instead of looping through the public ingress. When building outside `make k8s`, pass `NEXT_IMAGE_STOREFRONT_ORIGIN` to the admin image at build time and set the matching `STOREFRONT_ASSET_ORIGIN` at runtime. Private Service IP optimization is enabled only in that admin build and remains restricted by Next.js `remotePatterns`.

Example production override:

```yaml
global:
  imageRegistry: ghcr.io/example/ecommerce

services:
  product:
    image:
      repository: product-service
      tag: "2026.07.18"
      digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

## Production Notes

- Keep stateful dependencies outside this application chart: Postgres, MongoDB, Kafka, Clerk, Stripe, and secret managers are environment concerns.
- The local namespace targets apply Kubernetes Pod Security Admission labels at the Restricted level, pinned to the chart's oldest supported minor (`v1.34`). Override `K8S_POD_SECURITY_LEVEL` or `K8S_POD_SECURITY_VERSION` only when the cluster has a documented compatibility requirement.
- Supply immutable application image digests for shared environments. The chart no longer defaults to `latest`.
- Keep `secrets.create=false` outside throwaway environments and wire `secrets.name` to your secret manager output.
- Keep `ingress.tls.secretName` owned by cert-manager or the platform ingress layer outside local development.
- Prefer standard Ingress for the local Traefik workflow. For Gateway API, run `make k8s-gateway-api`, enable Traefik's Gateway provider, and deploy the chart with `gateway.enabled=true` only after the pinned standard CRDs are installed.
- The chart spreads replicas across nodes with a soft `ScheduleAnyway` constraint. Override `services.<name>.topologySpreadConstraints` for workload-specific zone or node placement.
- Enable `networkPolicy.enabled=true` only after your cluster CNI enforces NetworkPolicy and you have modeled required ingress and egress. Its safe fallback admits same-namespace pods only; add the ingress controller namespace to `networkPolicy.ingressFrom` when the controller runs elsewhere.
