# Turborepo Excellence Plan

This repo is already well past "starter monorepo" territory: it has real service ownership, Bun workspaces and catalogs, strict Turbo environment mode, package-specific Turbo configs for the Next.js apps, Docker `turbo prune --docker`, hardened runtime images, Helm, CI quality gates, SBOM/provenance output, and a useful `doctor` command.

The goal now is to make it stand out as a reference-quality Turborepo: fast, measurable, safe to change, easy to demo, and credible as a production platform.

## What "Best" Means Here

Use this scorecard as the north star:

| Area | Target outcome | Proof |
| --- | --- | --- |
| Build speed | CI and local rebuilds avoid repeated work | Remote cache hit rate, warm build time, run summaries |
| Cache correctness | Different runtime/build env values cannot restore wrong artifacts | `env`/`globalEnv` audit, `.env*` inputs, strict mode, signed remote cache |
| Boundaries | Apps and services cannot import across domain lines accidentally | `turbo boundaries`, package tags, dependency policy |
| Package quality | Shared packages are easy to navigate and cache where it matters | clear `exports`, selective compiled packages, package-local tests |
| Change confidence | Important user and service flows are tested at the right level | package tests, contract tests, e2e flows, Docker/Kubernetes smoke tests |
| Platform credibility | Images, CI, and deployments show supply-chain maturity | SBOM, provenance, artifact attestations, pinned permissions, image signing |
| Developer experience | A new developer can run, debug, and understand the repo quickly | `doctor`, one-command demos, architecture docs, ADRs, generated graphs |

## Current Strengths To Preserve

- `package.json` uses Bun workspaces, a root catalog, `workspace:*` internal package references, and root scripts that make the workflow easy to find.
- `turbo.json` uses `envMode: "strict"` and the Next.js package configs include `.env*` inputs, output globs, and build environment variables.
- Dockerfiles already use `turbo prune --docker`, which is one of the most important monorepo Docker optimizations.
- CI already runs dependency policy, lint, Knip, coverage, audit, type checks, builds, Docker image builds, SBOM, and provenance.
- The architecture is domain-oriented: product, payment, order, API client, contracts, Kafka, Hono utilities, and database packages each have a clear reason to exist.
- `docs/ARCHITECTURE.md`, `docs/QUALITY.md`, app READMEs, chart docs, and `scripts/doctor.ts` give the repo a serious operational baseline.

## Implemented Foundation

This pass moved the first excellence items from plan to enforcement:

- Added `turbo boundaries` package tags and rules for web apps, services, data packages, Kafka, and runtime utilities.
- Added `bun run boundaries` to the main CI verification path.
- Enabled signed remote cache configuration with the longer signature-key future flag.
- Added Turbo run summaries, task graph generation, a human-readable `docs/turbo-report.md`, and CI artifact upload.
- Enabled task-input-aware affected behavior through Turborepo future flags.
- Refreshed current patch/minor catalog and tooling versions using `bun outdated --recursive`.
- Added W3C trace context, structured HTTP telemetry, Kafka message telemetry, and checkout payment-to-product trace propagation.

## Highest-Impact Improvements

### 1. Make Turbo Performance Measurable

Add a repeatable benchmark so every optimization can prove itself.

Status: foundation implemented. `bun run turbo:inspect` now generates summaries, a task graph, and a human-readable report; CI uploads the artifacts. Next step is to record baseline numbers and enforce a performance budget.

Recommended first steps:

- Add a `make turbo-report` or `bun run turbo:report` command that runs:
  - `bunx turbo run build check-types --summarize`
  - `bunx turbo run build check-types --graph=docs/task-graph.mermaid`
  - a small script that records cold build time, warm build time, cache hit rate, and selected task count.
- Upload `.turbo/runs/*.json` and the task graph as CI artifacts.
- Add a short "Performance Budget" section to `docs/QUALITY.md` with current baseline numbers.

Done when:

- PRs can show whether they changed task count, cache hit rate, or warm build time.
- Cache misses are explainable from Turbo run summaries.

### 2. Enable Remote Cache With Integrity

The current CI uses `actions/cache` for `.turbo`, which helps, but a true shared remote cache is what makes Turborepo feel magical across developers and CI.

Status: integrity config implemented. `remoteCache.signature` and `futureFlags.longerSignatureKey` are enabled; CI now accepts `TURBO_TEAM`, `TURBO_TOKEN`, and `TURBO_REMOTE_CACHE_SIGNATURE_KEY`. Next step is to provision the actual remote cache secrets.

Recommended first steps:

- Add `TURBO_TOKEN` and `TURBO_TEAM` to CI jobs that run Turbo.
- Add `remoteCache.signature: true` to `turbo.json`.
- Store `TURBO_REMOTE_CACHE_SIGNATURE_KEY` as a CI secret and document local setup.
- Keep `actions/cache` for Bun, Next, and fallback `.turbo` cache, but treat remote cache as the primary path.

Done when:

- A fresh CI runner can restore build/check artifacts produced by another runner.
- The repo documents cache setup without exposing secrets.
- Remote cache artifacts are signature-verified before use.

### 3. Audit Environment Hashing

Strict mode is already enabled, but many variables are currently listed in `globalPassThroughEnv`. Pass-through variables are available at runtime without changing task hashes, so the repo should separate "needed to execute" from "changes output".

Recommended first steps:

- Keep secrets and runtime-only values in `globalPassThroughEnv`.
- Move values that affect build output into task-level `env`, especially for Next.js and any service build steps that embed configuration.
- Keep app-local `.env*` files in task `inputs` where used.
- Gradually reduce reliance on a root `.env` for app-specific values and prefer per-app env files where possible.
- Add a short checklist to PR review: "Does this env var affect build output, runtime only, or both?"

Done when:

- `turbo run build --summarize` clearly shows the environment inputs that should invalidate each build.
- Changing a public URL or build-time feature flag causes the right package to miss cache, not the whole repo.

### 4. Enforce Package Boundaries

The repo has good conceptual boundaries. Make them executable.

Status: implemented for current package ownership. Boundary tags and deny rules are active, and `bun run boundaries` is in CI.

Recommended first steps:

- Add package tags in package-level `turbo.json` files, for example:
  - `app:web` for `apps/client` and `apps/admin`
  - `service:product`, `service:payment`, `service:order`
  - `shared:contract`, `shared:client`, `shared:runtime`, `data:product`, `data:order`, `infra:kafka`
- Add `boundaries` rules in the root `turbo.json`.
- Add `bunx turbo boundaries` to `ci:verify`.
- Forbid frontends from importing database packages directly.
- Forbid services from importing another service's database package unless explicitly allowed.
- Require all cross-package imports to be declared in `package.json`.

Done when:

- A bad import such as `apps/client -> @repo/product-db` fails CI.
- The package graph becomes a documented architectural control, not just a diagram.

### 5. Split Tests Into Package-Owned Tasks

The root test suite is useful, but the best Turborepos let changed packages run their own tests and cache independently.

Recommended first steps:

- Keep root integration tests for cross-service behavior.
- Add package-local `test` scripts for shared packages with meaningful unit tests.
- Add a root `test` Turbo task with outputs for coverage where applicable.
- Use `turbo run test check-types build --affected` for PR fast paths, with a scheduled or protected-branch full run.
- Keep coverage reports as artifacts, but avoid treating massive coverage folders as remote-cache outputs unless they are worth restoring.

Done when:

- A change in `packages/kafka` selects Kafka tests and downstream dependents.
- A frontend-only change does not require unrelated package tests unless an integration gate is intentionally running.

### 6. Compile Only The Shared Packages That Benefit

This repo currently uses mostly Just-in-Time internal packages by exporting TypeScript source. That is simple and good for fast iteration. The upgrade is not "compile everything"; it is "compile the packages where cache, runtime isolation, or Docker image quality improve".

Best candidates:

- `@repo/contracts`
- `@repo/api-client`
- `@repo/kafka`
- `@repo/hono-utils`
- database helper packages if runtime images should stop copying all package source

Recommended first steps:

- Add `build` scripts using `tsc` or the repo's chosen TypeScript runner.
- Emit `dist/**` and add it to Turbo `outputs`.
- Keep `types` pointing to source or generated declarations so editor navigation stays good.
- Update Docker runtime stages to copy compiled package output where it simplifies images.
- Leave pure schema/type packages as JIT if compiling adds more complexity than value.

Done when:

- Shared runtime packages can hit cache as independent build tasks.
- Docker images carry less source and fewer dev-only files.
- Editor go-to-definition remains pleasant.

### 7. Add End-To-End Product Proof

The repo will stand out more if it proves the whole commerce story, not only isolated package correctness.

Recommended first steps:

- Add Playwright smoke flows:
  - browse products in `client`
  - add to cart and start checkout with Stripe test mode or a mocked payment path
  - view payment/order state in `admin`
  - verify service diagnostics/health pages
- Add a Docker Compose e2e target that starts the stack, seeds data, and runs the browser tests.
- Add a Kubernetes smoke target that checks public routes and readiness after Helm deploy.

Done when:

- A reviewer can trust that storefront, admin, APIs, Kafka, Stripe integration surface, and read models still cooperate.
- The README can honestly advertise a one-command demo and a one-command e2e proof.

### 8. Add Observability As A First-Class Feature

The services already have request IDs, timing, health, readiness, and shared Hono runtime helpers. Build on that.

Status: first telemetry layer implemented. HTTP and Kafka logs now carry trace IDs and OpenTelemetry-style attributes; next step is a collector/dashboards profile.

Recommended first steps:

- Add OpenTelemetry tracing to Hono services and the API client.
- Propagate request IDs through HTTP calls and Kafka event metadata.
- Add a local observability Compose profile with Prometheus/Grafana or OpenTelemetry Collector/Tempo.
- Add dashboards for request rate, error rate, latency, Kafka consumer lag, and dependency readiness.
- Document SLO-style targets for local and deployed environments.

Done when:

- A failed checkout/order flow can be traced across storefront, payment service, Kafka, and order service.
- The demo includes visible operational insight, not just happy-path UI.

### 9. Raise Supply-Chain Credibility

CI already emits SBOM and provenance for Docker builds. The next layer is verification and policy.

Recommended first steps:

- Add GitHub Artifact Attestations for published images or release artifacts.
- Sign container images with a keyless signing flow such as Sigstore/cosign if that fits the deployment target.
- Pin third-party GitHub Actions by SHA for higher-assurance workflows.
- Add CodeQL or equivalent code scanning for service and frontend code.
- Add Dependabot or Renovate rules that understand Bun catalog updates.
- Document how to verify image provenance before deploy.

Done when:

- A release has image digest, SBOM, provenance, and an attestation verification command.
- CI permissions remain least-privilege per job.

### 10. Turn The Repo Into A Showcase

This is the polish layer that makes the repo memorable.

Recommended first steps:

- Add `docs/DEMO_SCRIPT.md` with a timed path through Docker, storefront, checkout, admin, Kafka UI, and API docs.
- Add ADRs for major choices: Bun, Turborepo, Hono, oRPC contracts, Kafka event model, PostgreSQL plus MongoDB, Docker Hardened Images, Helm.
- Generate and commit lightweight diagrams from source-owned definitions where practical.
- Add a "Why this monorepo is interesting" README section with concrete engineering claims and links to proof.
- Add screenshots or short recordings for storefront, admin, service docs, and observability once stable.

Done when:

- A hiring manager, reviewer, or teammate can understand the architecture in five minutes and validate it in thirty.
- The repo tells a coherent story: fast monorepo, typed contracts, event-driven services, production-style platform, and strong developer experience.

## Suggested PR Sequence

1. Baseline metrics and reports: add Turbo summary/graph commands, CI artifacts, and a performance budget.
2. Remote cache: wire `TURBO_TOKEN`, `TURBO_TEAM`, signed cache config, and setup docs.
3. Boundaries: add tags, rules, and `turbo boundaries` to CI.
4. Test ownership: introduce package-local `test` scripts and an affected PR gate.
5. Selective package compilation: compile one shared runtime package first, measure impact, then repeat only where useful.
6. E2E proof: add Docker-backed Playwright smoke tests for the core commerce path.
7. Observability profile: add tracing, dashboards, and request/event correlation.
8. Supply-chain verification: add attestation verification and image signing policy.
9. Showcase docs: add ADRs, demo script, task graph, screenshots, and an updated README story.

## Reference Links

- Turborepo introduction and core value: https://turborepo.dev/docs
- Turborepo caching, task inputs, outputs, summaries, and cache troubleshooting: https://turborepo.dev/docs/crafting-your-repository/caching
- Turborepo remote caching and artifact signature verification: https://turborepo.dev/docs/core-concepts/remote-caching
- Turborepo environment variable hashing and strict mode: https://turborepo.dev/docs/crafting-your-repository/using-environment-variables
- Turborepo package configurations and `$TURBO_EXTENDS$`: https://turborepo.dev/docs/reference/package-configurations
- Turborepo package and task graph: https://turborepo.dev/docs/core-concepts/package-and-task-graph
- Turborepo boundaries command and tags: https://turborepo.dev/docs/reference/boundaries
- Turborepo TypeScript guide and internal package tradeoffs: https://turborepo.dev/docs/guides/tools/typescript
- Turborepo internal package strategies: https://turborepo.dev/docs/core-concepts/internal-packages
- Turborepo Docker guide with `turbo prune --docker`: https://turborepo.dev/docs/guides/tools/docker
- Turborepo `prune` reference: https://turborepo.dev/docs/reference/prune
- Turborepo GitHub Actions guide: https://turborepo.dev/docs/guides/ci-vendors/github-actions
- Turborepo `run` flags, including `--affected`, `--filter`, `--graph`, and cache controls: https://turborepo.dev/docs/reference/run
- Bun workspaces: https://bun.sh/docs/pm/workspaces
- Bun catalogs: https://bun.com/docs/pm/catalogs
- Docker GitHub Actions cache guidance: https://docs.docker.com/build/ci/github-actions/cache/
- Docker build attestations: https://docs.docker.com/build/metadata/attestations/
- GitHub Actions security hardening: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub Artifact Attestations: https://docs.github.com/en/actions/security-guides/use-artifact-attestations
- SLSA requirements: https://slsa.dev/spec/v1.1/requirements
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- W3C Trace Context: https://www.w3.org/TR/trace-context/
