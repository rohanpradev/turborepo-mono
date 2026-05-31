# Ecommerce Helm Chart

This chart deploys the ecommerce application layer: storefront, admin, product service, order service, payment service, services, ingress, probes, PDBs, optional HPAs, optional network policies, and migration/seed jobs.

Stateful infrastructure is not bundled into this chart. Postgres, MongoDB, Kafka, Clerk, and Stripe are supplied through values and Kubernetes Secrets. That keeps the app chart portable across local clusters, staging, and production.

## Local Workflow

```bash
make k8s-preflight
make k8s-build-images
make k8s-validate
make k8s-up
make k8s-status
```

`make k8s-up` is the local web path: it builds client/admin images, validates the rendered manifests, syncs TLS and runtime auth secrets, deploys with Helm using `--rollback-on-failure --wait`, waits for rollout, and smoke-tests the Traefik routes. Use `make k8s-up-full` after Postgres, MongoDB, and Kafka are available in the cluster.

Useful lower-level commands:

```bash
make helm-lint
make helm-template
make helm-dry-run
make helm-package
make k8s-diff
make k8s-deploy
make k8s-wait
make k8s-smoke
make k8s-test
make k8s-events
make k8s-logs-client
make k8s-logs-admin
make k8s-logs-product
make k8s-logs-order
make k8s-logs-payment
make k8s-describe K8S_SERVICE=product-service
make k8s-restart
make k8s-uninstall
```

The local values file uses Gateway API routes attached to the existing Traefik gateway at `traefik/traefik-gateway`, because the local Traefik install exposes Gateway API and Traefik CRD providers rather than the standard Kubernetes Ingress provider.

Local routes:

- `https://shop.localhost`
- `https://admin.localhost`
- `https://api.localhost`

Docker Compose intentionally uses `https://shop.localhost:8443` so it does not fight Kubernetes for host port 443.

For clusters that use the standard Kubernetes Ingress provider, set `gateway.enabled=false`, `ingress.enabled=true`, and `ingress.className` to the ingress class installed in that environment.

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
- Prefer Gateway API HTTPRoutes when Traefik is installed with its Gateway provider, and standard Ingress only when the Kubernetes Ingress provider is actually enabled.
- Enable `networkPolicy.enabled=true` only after your cluster CNI enforces NetworkPolicy and you have modeled required egress.
