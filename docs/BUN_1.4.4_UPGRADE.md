# Bun 1.4.4 upgrade review

Reviewed on 23 October 2026 against the [official Bun 1.4.4 release](https://bun.com/blog/bun-v1.4.4), published on 22 October, and the installed runtime. This upgrade builds on the existing dependency and infrastructure changes in the working tree. The [1.4.3 review](BUN_1.4.3_UPGRADE.md) remains a historical record of checker adoption and earlier deployment checks; those results do not establish verification of these newer versions.

## Version and dependency decisions

The root Bun engine, package-manager declaration, development engine, CI version, Compose helper, and all five application Dockerfiles select Bun 1.4.4. Container inputs remain pinned by both version and digest.

| Dependency                | Previous | Updated |
| ------------------------- | -------- | ------- |
| Bun runtime               | 1.4.3    | 1.4.4   |
| `@types/bun` catalog      | 1.4.3    | 1.4.4   |
| Stripe server SDK catalog | 23.0.0   | 23.0.1  |

The existing baseline includes Next.js 16.4.2, React 19.3.1, Hono 4.13.13, Biome 2.6.2, Knip 6.42.1, and Turborepo 2.11.10. The [22 October engineering review](ENGINEERING_REVIEW_2026-10-22.md) records those compatible upgrades, transitive security repairs, and their original validation. Shared versions remain in the root catalog and workspace manifests retain `catalog:` references. Lockfile refreshes must preserve the KafkaJS patch and explicit security overrides.

Prisma ORM remains exactly `8.0.0-rc.17`, paired with CLI `8.0.0-rc.22`. Newer release candidates change nullable-array contracts and client construction, and require a separate contract and database-signing migration. The [recorded Prisma migration rationale](ENGINEERING_REVIEW_2026-10-22.md#prisma-migration-deliberately-separated) explains the required rehearsal; routine dependency maintenance must not rewrite applied migration snapshots.

## Container inputs

Registry checks verified the Bun 1.4.4 image and refreshed the rebuilt Traefik, MongoDB, and Kafka image digests. Stripe CLI is updated to 1.55.1. The Compose and Dockerfile pins use these verified inputs:

| Image               | Version                 | Digest                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `oven/bun`          | `1.4.4`                 | `sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d` |
| `traefik`           | `v3.7.16`               | `sha256:c8a121e4bb1347e8fd52657fab12f2cb70b68f8a018895e2068f92c9e519b9c2` |
| `dhi.io/mongodb`    | `8.3.13-debian13`       | `sha256:0162625dc28370f5769327e7e8dae540f2ba4143fb215eb6eda3753d073064c6` |
| `dhi.io/kafka`      | `4.3.1-debian13-native` | `sha256:e143e49a67f9aaef9a992896162731f7428f6e5af2aa68b9a99ee723a0e1fbed` |
| `stripe/stripe-cli` | `v1.55.1`               | `sha256:abb51eab2607fc16375ce79da40edfc3ae92f2a7ac100e44889ba1b291b41c83` |

Registry verification establishes the pinned image identity; application image builds and runtime checks are separate evidence.

The platform toolchain selects Traefik chart 42.1.3 with image 3.7.16 and kube-prometheus-stack 92.11.0. The chart registry index revealed the additional 42.1.3 patch during final verification; its archive checksum, rendering, and lint checks pass. Native-resource schema validation of that controller chart on Kubernetes 1.35.9 and 1.36.5 is the remaining targeted check.

## Release feature decisions

- **Keep Biome.** It owns formatting, lint rules, import assistance, Markdown frontmatter, and Helm-template exclusions. `bun fmt` reads Prettier/oxfmt configuration and does not consume this policy. Replacing the formatter requires a separate review of output and exclusions.
- **Keep the existing checkers.** Workspace and tooling tasks already use `bun check`; service watch commands and tests already check types before execution. The upgraded checker benefits these commands without task-graph changes. TypeScript remains installed for editors and Next.js builds.
- **Keep portable installs.** Development uses the isolated linker with `hoist = false`; Docker uses explicit hoisted frozen installs from Turbo-pruned manifests. CI retains `bun ci` and its package cache. Automatic install retries now use backoff, while Linux resolution can skip optional native packages for the other libc.
- **Keep the existing Docker dependency layers.** The pruned manifests already separate dependency installation from application source. `bun pm fetch` and offline installs can support a future cache design, but making offline installation mandatory would require verifying cache persistence and native-package availability on both release architectures.
- **Keep existing integration ownership.** No requirement calls for Yarn migration, recursive publication, new package extensions, a global virtual store, or replacing PostgreSQL/MongoDB/Kafka drivers with new Bun APIs.

The lockfile can now record libc and install-script metadata. Refresh it with Bun 1.4.4 and verify frozen installation rather than editing resolved metadata manually. Re-run coverage: the release corrects branch and unfinished asynchronous-code accounting, so the earlier runtime's percentages must not be carried forward.

## Verification

Checks use Bun `1.4.4+38afee6c8`. Dependency, application, application container builds, and static deployment verification below are complete. Only the targeted Traefik 42.1.3 native-resource schema checks noted above remain pending.

| Check                                         | Result                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun pm fetch` and final `bun ci --offline`   | Fetched 511 packages; final offline frozen install checked 796 resolved packages without changes.                                                                                                                                    |
| Catalog alignment and lockfile deduplication  | Pass; no duplicate resolutions remain.                                                                                                                                                                                               |
| `bun run audit`                               | No vulnerabilities across 731 packages.                                                                                                                                                                                              |
| Checked tests and coverage                    | 189 tests pass, 586 assertions across 30 files. Measured coverage is 71.19% of lines and 65.56% of functions.                                                                                                                        |
| Workspace and tooling type checks             | All 14 tasks pass.                                                                                                                                                                                                                   |
| Unit and integration test-project type checks | Pass; integration types do not establish live database execution.                                                                                                                                                                    |
| Production builds                             | Both standalone Next.js production builds pass.                                                                                                                                                                                      |
| Standalone web smoke tests                    | Storefront streaming and stock-state checks pass, with 5 pages and 22 assets; admin checks pass with 6 pages and 15 assets.                                                                                                          |
| Database contract validation                  | Both generation/validation tasks pass without a live database.                                                                                                                                                                       |
| Knip                                          | Both development and strict production checks pass.                                                                                                                                                                                  |
| Package boundaries                            | Pass across 195 files and 13 packages.                                                                                                                                                                                               |
| Compose rendering                             | Both configurations pass.                                                                                                                                                                                                            |
| Docker build checks                           | All five Dockerfiles pass `--check` without warnings.                                                                                                                                                                                |
| Helm schema and profile checks                | Eight supported-version profile combinations pass schema validation and policy checks; four experimental-version combinations pass policy checks.                                                                                    |
| Final lint                                    | Pass across 356 files.                                                                                                                                                                                                               |
| Generated custom-resource schemas             | Generator `--check` verifies all five pinned schema outputs. Generated JSON is excluded from general Biome formatting.                                                                                                               |
| Application container builds                  | All five images build successfully with Bun 1.4.4.                                                                                                                                                                                   |
| Restricted image runtime checks               | Backend production imports pass. Both web images pass isolated checks with read-only roots and no network: health returns 200; storefront `/cart` returns 200 with CSS; admin `/users/smoke-test` returns the expected 404 with CSS. |
| Traefik chart 42.1.3                          | Archive checksum, render, and lint pass; native-resource schemas on 1.35.9 and 1.36.5 pending.                                                                                                                                       |

The first sandboxed test run failed to bind a temporary loopback port; the suite passes with local binding enabled. The sandboxed production build also required compiler permissions; both builds pass with those permissions.

Container Next.js builds emitted nonfatal `CLIENT_HOOK_DYNAMIC` prerender diagnostics for `/cart` and `/users/[id]`. Host builds were clean, and the isolated image runtime checks above did not reproduce the diagnostics. These checks do not establish authenticated checkout or admin operations against live dependencies. No live rollout or live database/Kafka integration run was performed.
