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

Chart-only validation fixtures live under `charts/ecommerce/ci`. The existing
`environments/staging` and `environments/production` profiles are commissioning
templates with placeholder hosts, registries, and network ranges. Follow the
[environment commissioning guide](environments/README.md) before using them.

## Verify application images before publication

CI follows Docker's [test-before-push workflow](https://docs.docker.com/build/ci/github-actions/test-before-push/):
it loads an AMD64 image, verifies that artifact, then publishes the cached
AMD64/ARM64 build with provenance and an SBOM. A failed runtime check prevents
publication. ARM64 is build-checked; this gate does not establish ARM64 runtime
qualification or authenticated commerce behavior against live services.

Run the same check against a locally built image:

```bash
bash docker/test-image.sh client turborepo-monorepo-client:latest
bash docker/test-image.sh product-service turborepo-monorepo-product-service:latest
```

The check also accepts `admin`, `order-service`, and `payment-service`. Containers
run as UID/GID 65532 with a read-only root, dropped capabilities, no external
network, and only the temporary/cache mounts used by deployments. Web checks
exercise the standalone server, a rendered page, referenced assets, and native
image optimization. Admin access must fail closed without authentication.
Backend checks resolve all application imports from the production image and
require live health with unavailable dependencies reported as unready; they do
not start migrations or background workers. Temporary web containers are removed
on success and failure, and failures include container logs.

`compose.integration.yml` supplies disposable PostgreSQL, MongoDB, and Kafka
dependencies using the same exact image pins as the CI integration job. Kafka
readiness requires a successful metadata request rather than an open TCP port.
Separate internal and external listeners keep the container's readiness check
reachable while host-side tests use `127.0.0.1:59092`.
