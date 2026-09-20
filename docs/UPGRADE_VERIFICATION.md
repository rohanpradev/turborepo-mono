# Upgrade verification — 2026-09-05

This update preserves the in-progress Prisma 8 migration and upgrades the repository against npm dist-tags, official release APIs, container registries, and the documentation below. Runtime and infrastructure pins remain explicit; no production deployment is performed.

## Versions

| Component | Verified target |
| --- | --- |
| Bun / CI / five app images | 1.4.2 |
| Node.js CI | 24.20.0 (LTS) |
| Next.js / React | 16.3.4 / 19.2.8 (already current) |
| Prisma CLI / PostgreSQL runtime | 8.0.0-rc.13 / 8.0.0-rc.8 |
| Clerk Next.js / Hono / Mongoose | 7.9.1 / 4.13.7 / 9.9.5 |
| Stripe React / Stripe CLI | 6.9.0 / 1.50.10 |
| PostgreSQL / MongoDB / Kafka | 18.6 / 8.3.8 / 4.3.1 |
| Docker socket proxy | 0.5.0 |
| Buildx / BuildKit | 0.37.0 / 0.33.0 |
| Helm / Traefik | 4.2.4 / 3.7.12 (already current) |
| Gateway API / kube-prometheus-stack | 1.6.2 / 89.2.2 |
| Helm test curl image | 8.22.0 |

The catalog also updates Lucide, PostCSS, Hono OpenAPI, Bun/React DOM/PostgreSQL types, and transitive security overrides. Docker actions use verified commit SHAs. Container references use verified multi-platform index digests where available; MongoDB retains its existing amd64 platform requirement.

Prisma packages remain release candidates because the application already uses the Prisma 8 contract/runtime API and the registry's latest tags are RC releases. They are pinned exactly to prevent a floating range selecting a development build. The PostgreSQL type override aligns Prisma's pinned transitive types with the application's current `pg` types; it changes no runtime code.

## Compatibility fixes

- Product writes, catalog seed events, and outbox leases use explicit UTC. PostgreSQL timestamp-without-time-zone values keep their existing UTC API convention regardless of the host timezone. Regression tests cover Asia/Kolkata and America/Los_Angeles.
- `db:deploy` uses the documented `prisma db migrate` command. The old `--to @contract` argument fails with `MIGRATION.REF_NOT_FOUND`. Migration failures stop deployment instead of triggering automatic signing; matching legacy databases use the separate strict `db:adopt` workflow.
- Helm schema validation checks rendering success before invoking kubeconform, so a failed Helm command cannot be hidden by a successful downstream pipe.
- Monitoring chart 89 adopts Grafana's distroless image and read-only filesystem defaults. The local values use none of the removed `GF_*__FILE`/`GF_INSTALL_PLUGINS` settings and do not duplicate the new `/tmp` volume. Existing Make targets update CRDs before controller upgrades.
- Kubernetes 1.35.8 and 1.36.4 remain the supported deployment matrix. Version 1.37.0 remains an experimental validation target because Helm 4.2 does not guarantee forward compatibility with it.

## Validation

- No outdated direct workspace dependencies reported by `bun outdated --recursive`.
- Frozen install succeeds; vulnerability audit reports zero vulnerabilities across 763 packages.
- Lint, dependency policy/deduplication, unused code, package boundaries, contract generation, and migration graph checks pass.
- All workspace type checks and both Next.js production builds pass.
- 59 tests pass, including three timestamp regression cases.
- All five application images build in OrbStack.
- Compose configuration and all 12 Helm profile rendering/policy checks pass; monitoring chart 89.2.2 renders and lints with local values.
- Fresh local database migration and seeding complete: 11 products across four categories, with catalog events published to Kafka.

The complete local `ci:verify` pipeline passes. Docker build checks report no warnings. GitHub Actions syntax/expression validation passes with actionlint 1.7.12. License inventory and Turbo diagnostic generation succeed. All 12 Kubernetes schema checks pass with zero invalid resources or errors; the three Gateway CRD resources per Gateway profile are skipped by kubeconform and covered by Helm rendering/policy checks. A simulated Helm rendering failure correctly fails validation.

Live OrbStack smoke tests pass. Re-running `db:deploy` applies zero migrations; `db:verify` confirms both the database marker and schema match the contract.

## Checkout and admin verification

The user completed sign-in and a Stripe test checkout in Chrome. Verification confirmed:

- Stripe return page: paid, cart cleared, and a payment intent present.
- Shopper order history: one successful order for $164.80.
- MongoDB: exactly one matching order, status `success`, with one Monochrome Runner ($89.90) and one Transit Zip Hoodie ($74.90).
- Admin payment timeline: checkout creation, verified Stripe webhook signatures, and `payment.successful.published`, with the same checkout and payment intent identifiers.
- Admin customer detail: persisted order ID, confirmation status, both line items, customer email, $164.80 total, and the matching paid checkout session.

The customer detail page now loads persisted orders, as the directory already did, instead of relying exclusively on the rolling payment-event buffer. It shows line items and totals and preserves customer records when their recent events age out.

Checkout identifier ends in `KmWqFi2`; payment intent ends in `ajzqsfo`. No live-mode payment was made. The stack was healthy during verification; the final handoff check found no containers remaining in OrbStack.

## Existing GitHub CI failure

[CI run 33522265157](https://github.com/rohanpradev/turborepo-mono/actions/runs/33522265157) passed Quality and four Docker jobs; the storefront Docker job failed because PostCSS tried to parse `ProductInteraction.tsx` as CSS (`Unknown word "use client"`). The updated repository includes the object-form PostCSS configuration and updated Bun/PostCSS versions. A clean Linux amd64 storefront build with Bun 1.4.2 and the CI-pinned BuildKit 0.33.0 completed successfully, including compilation, TypeScript, prerendering, standalone output, and image export. This validates the previously failing platform as well as the native arm64 builds used for the browser test. The temporary validation builder was removed after completion.

These edits are local and uncommitted. A new hosted GitHub run requires pushing the changes; the prior failed run is not evidence about this working tree.

## Official references

- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Bun 1.4.2 release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.2)
- [Prisma 8 migration workflow](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
- [Temporal API and timezones](https://tc39.es/proposal-temporal/docs/)
- [PostgreSQL 18.6 upgrade notes](https://www.postgresql.org/docs/release/18.6/)
- [MongoDB 8.3 release notes](https://www.mongodb.com/docs/manual/release-notes/8.3/)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Helm supported Kubernetes versions](https://helm.sh/docs/topics/version_skew/)
- [Gateway API 1.6.2](https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.6.2)
- [Monitoring chart upgrade guide](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/UPGRADE.md)
- [Grafana chart 13 migration](https://github.com/grafana-community/helm-charts/tree/main/charts/grafana#to-1300)
