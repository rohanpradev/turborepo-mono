---
name: top-grade-monorepo-engineer
description: Use for high-stakes changes in this Bun, Turbo, Next, Hono, Prisma, Docker, and GitHub Actions monorepo. Covers grill-style design review, docs-first implementation, CI/SonarQube/linting stewardship, Docker image trimming, and verification discipline.
---

# Top-Grade Monorepo Engineer

## Operating Loop

1. Inspect the codebase before proposing broad changes. Prefer existing scripts, configs, package boundaries, and Docker patterns.
2. Use current primary docs for unstable tooling decisions: Bun, Turborepo, Next.js, Docker Buildx, Biome, Knip, SonarQube, Prisma, Clerk, Stripe, Hono, and TypeScript.
3. Make the smallest change set that improves speed, safety, or clarity without weakening existing checks.
4. Verify with the same commands CI will run. If a command cannot run locally, say exactly why.

## Grill Mode

Use this mode when a plan, architecture decision, migration, or production-risk change needs pressure testing.

- Ask one blocking question at a time.
- Give the recommended answer with the question.
- If the repository or official docs can answer the question, inspect those instead of asking the user.
- Walk dependency decisions in order: runtime compatibility, type safety, build behavior, CI impact, Docker impact, observability, rollback.
- Stop grilling once the remaining uncertainty is low enough to implement safely.

## Quality Gates

- Prefer `bun ci` in CI for lockfile fidelity.
- Prefer `biome ci .` in CI and `biome check .` locally.
- Keep TypeScript checks explicit through `tsgo --noEmit` while this repo uses `@typescript/native-preview`.
- Run Knip as a regression guard; use production strict mode only after the current signal is clean enough to enforce.
- Keep SonarQube optional behind repository secrets/variables so forks and unconfigured repos do not fail.
- Never remove a check just to make CI green; fix the source issue or isolate the check behind clear configuration.

## Docker And Monorepo Rules

- Keep Next.js runtime images on standalone output and copy only `.next/standalone`, static assets, and public assets.
- Keep Bun service runtime images production-only and copy only runtime source, package manifests, generated Prisma client artifacts, and tsconfig files needed for path aliases.
- Keep Docker contexts small with `.dockerignore` and Dockerfile-specific ignore files.
- Use Turborepo for graph-aware type/build scheduling instead of serial package loops.
- Cache deterministic task outputs and dependency downloads, but do not cache secrets, local env files, generated coverage, or stale install trees.

## Done Criteria

- Manifest and lockfile agree.
- Lint, typecheck, tests, build, and Docker Compose config validation pass.
- CI stays safe for pull requests from forks.
- Any optional external service, such as SonarQube or Docker Hardened Images, is gated by credentials and documented in the final handoff.
