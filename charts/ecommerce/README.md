# Ecommerce Helm Chart

This chart deploys the ecommerce application layer: storefront, admin, product service, order service, payment service, services, ingress, probes, PDBs, optional HPAs, optional network policies, and migration/seed jobs.

Stateful infrastructure is not bundled into this chart. Postgres, MongoDB, Kafka, Clerk, and Stripe are supplied through values and Kubernetes Secrets. That keeps the app chart portable across local clusters, staging, and production.

## Local Workflow

```bash
make k8s
make ks8
make kubernetes
make k8s-traefik-status
make k8s-logs-traefik
make k8s-test
make k8s-status
```

`make k8s` is the one-command local Kubernetes setup: it installs or upgrades Traefik, starts Docker-backed Postgres, MongoDB, and Kafka, builds app images, loads them into kind or minikube when needed, validates the Helm chart, syncs TLS and runtime secrets, deploys the release, waits for rollout, and smoke-tests the routes. `make ks8` is kept as a friendly alias for the common typo, and `make kubernetes` does the same thing. Use `make k8s-full` only when Postgres, MongoDB, and Kafka already run inside your cluster. Run `make k8s-test` against the deployed release if you want Helm test coverage.

Useful lower-level commands:

```bash
make helm-lint
make helm-template
make helm-dry-run
make helm-package
make k8s-doctor
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
make k8s-open
make k8s-uninstall
```

The local workflow installs Traefik as a standard Kubernetes Ingress controller and deploys app routes with `ingressClassName: traefik`.

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

For registries, set `global.imageRegistry` and per-service tags.

## Production Notes

- Keep stateful dependencies outside this application chart: Postgres, MongoDB, Kafka, Clerk, Stripe, and secret managers are environment concerns.
- Use immutable image tags or digests for shared environments.
- Keep `secrets.create=false` outside throwaway environments and wire `secrets.name` to your secret manager output.
- Keep `ingress.tls.secretName` owned by cert-manager or the platform ingress layer outside local development.
- Prefer standard Ingress for the local Traefik workflow, and use Gateway API HTTPRoutes only in clusters where the Gateway provider and CRDs are already installed.
- Enable `networkPolicy.enabled=true` only after your cluster CNI enforces NetworkPolicy and you have modeled required egress.
