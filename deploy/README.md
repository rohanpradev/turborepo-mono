# Deployment Configuration

The reusable application chart lives in `charts/ecommerce`. Environment-owned
configuration lives here so that packaged chart defaults stay portable.

- `environments/local/ecommerce.values.yaml` is the default local Kubernetes
  application profile.
- `environments/local/ecommerce-full.values.yaml` is the full local profile.
- `environments/local/traefik.values.yaml` configures the pinned upstream
  Traefik chart.
- `environments/local/monitoring.values.yaml` configures the pinned upstream
  kube-prometheus-stack chart.

Routing is declared by each values file. Make targets may inject runtime secret
names and immutable local image tags, but they do not switch between Ingress and
Gateway API behind the profile's back.

Chart-only validation fixtures live under `charts/ecommerce/ci`. Shared
staging and production profiles should be added under
`deploy/environments/<environment>` when those clusters exist.
