---
name: top-grade-monorepo-engineer
description: Use for high-stakes changes in this Bun, Turborepo, Next.js, Hono, Prisma, Docker, GitHub Actions, SonarQube, Clerk, and Stripe monorepo. Covers grill-style design review, docs-first implementation, CI/lint/type/test stewardship, Docker image trimming, security discipline, and verification before handoff.
---

# Top-Grade Monorepo Engineer

Use this skill when the change is risky, cross-cutting, production-facing, infrastructure-related, security-sensitive, or likely to affect CI, Docker images, deployment, authentication, payments, database behavior, or shared package boundaries.

## Prime Directive

Keep the repository boring, fast, safe, and easy to operate.

Prefer the smallest verified change that improves correctness, reliability, speed, or clarity. Do not weaken checks to make a branch pass. Do not invent new patterns when the repository already has one.

## Operating Loop

1. Inspect before proposing.
   - Read the relevant package scripts, `turbo.json`, Dockerfiles, compose files, GitHub Actions workflows, Prisma schema/migrations, environment parsing, and nearby implementation.
   - Prefer existing package boundaries, naming, scripts, CI jobs, Docker stages, and deployment conventions.

2. Classify the risk.
   - Low risk: isolated implementation change with local tests.
   - Medium risk: touches shared packages, env vars, Docker, CI, auth, payments, or database reads.
   - High risk: touches migrations, production deployment shape, secrets, billing, auth flows, runtime images, public APIs, or rollback-sensitive behavior.

3. Ask only the questions that cannot be answered from the repo.
   - If code, docs, config, or official docs can answer it, inspect those instead.
   - Ask one blocking question at a time.
   - Include the recommended answer and the tradeoff with every question.

4. Make the smallest coherent change.
   - Keep unrelated cleanup out of the patch.
   - Avoid broad rewrites unless the user explicitly asked for a refactor plan.
   - Preserve working behavior while improving one axis at a time.

5. Verify with the same commands CI will run.
   - Prefer repo scripts over ad-hoc commands.
   - Run the narrowest useful check first, then the broader check before handoff.
   - If a command cannot run, state the exact reason and the next best validation.

6. Handoff clearly.
   - Summarize what changed, why it changed, what was verified, and what remains risky.
   - Mention any command that failed or could not be run.

## Grill Mode

Use Grill Mode before implementation when the plan affects architecture, migrations, package boundaries, deployment, CI, Docker, auth, payments, or production behavior.

### Rules

- Ask one blocking question at a time.
- Give the recommended answer with the question.
- Include the tradeoff.
- Do not ask questions that repository inspection can answer.
- Walk dependency decisions in order:
  1. Runtime compatibility
  2. API and type contracts
  3. Data model and migrations
  4. Auth, permissions, and tenancy
  5. Payment or webhook behavior
  6. Build and package boundaries
  7. Docker image impact
  8. CI and quality gates
  9. Observability and rollback
  10. Documentation impact

### Stop Condition

Stop grilling when these are clear:

- Implementation shape
- Data and API impact
- Validation plan
- Rollback path
- CI impact
- Docker/deployment impact
- Docs or ADR impact

## Grill With Docs

Use this when the plan must respect existing repository language, domain decisions, ADRs, or documented operational rules.

- Look for root docs first: `README.md`, `SKILLS.md`, `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/`, and `docs/adr/`.
- If `CONTEXT-MAP.md` exists, treat the repo as multi-context and use it to find the relevant `CONTEXT.md`.
- If the user uses a term that conflicts with `CONTEXT.md`, call it out immediately.
- If the user uses vague language, propose a precise canonical term.
- Update `CONTEXT.md` only for domain glossary terms, not implementation details.
- Create ADRs sparingly.

Create or propose an ADR only when all three are true:

1. The decision is hard to reverse.
2. The decision would surprise a future maintainer without context.
3. The decision came from a real tradeoff between alternatives.

## Karpathy-Style Engineering Loop

Use this for AI-assisted patches, ambiguous bugs, flaky behavior, model/tooling changes, and hard-to-debug system behavior.

- Become one with the examples before changing abstractions.
- Reproduce one real failure before generalizing.
- Start with a boring baseline.
- Make one end-to-end path work before widening scope.
- Fix randomness where practical.
- Change one variable at a time.
- Prefer real fixtures, failing tests, logs, traces, and screenshots over assumptions.
- Treat generated code as a proposal, not a decision.
- Inspect the final diff manually before handoff.

## Current Docs Rule

Use official current docs before making decisions about unstable or fast-moving tooling, including:

- Bun
- Turborepo
- Next.js
- Docker Buildx
- Biome
- Knip
- SonarQube
- Prisma
- Clerk
- Stripe
- Hono
- TypeScript
- GitHub Actions

Do not rely on memory for command names, CI behavior, Docker cache semantics, framework output structure, or provider-specific webhook/auth requirements when the exact behavior matters.

## Monorepo Boundaries

- Prefer Turborepo for graph-aware scheduling instead of hand-written serial package loops.
- Keep shared contracts in shared packages.
- Do not duplicate DTOs, env schemas, validation schemas, or API types across apps.
- Package exports should be explicit and stable.
- Avoid circular dependencies between workspaces.
- Do not let frontend packages import server-only modules, secrets, Prisma clients, provider SDKs, or Node-only runtime code.
- Keep package scripts consistent across workspaces where possible: `lint`, `typecheck`, `test`, `build`, `check`.

## Bun Rules

- Use `bun ci` in CI when the repository commits `bun.lock`.
- Use `bun install --frozen-lockfile` when matching an existing repo convention or Dockerfile pattern.
- Do not modify lockfiles casually.
- Manifest and lockfile must agree before handoff.
- Avoid undeclared tools downloaded implicitly during CI.
- Prefer scripts declared in `package.json` over one-off shell commands.

## Turborepo Rules

- Use Turbo task dependencies for graph-aware `build`, `typecheck`, `lint`, and `test`.
- Ensure task outputs are declared only when they are deterministic and useful to cache.
- Do not cache secrets, local env files, coverage directories, stale install trees, or non-deterministic artifacts.
- Include environment variables in `turbo.json` `env` or `globalEnv` when they affect task output.
- Use `turbo prune` or an equivalent existing repo pattern for Docker builds that target a subset of the monorepo.
- Prefer affected-package validation when working locally, then run the broader CI-equivalent check before handoff.

## Next.js Rules

- Preserve the app’s chosen routing model and runtime assumptions.
- Keep server-only code behind server boundaries.
- Do not expose secrets through public environment variables.
- Keep build output compatible with the Docker runtime strategy.
- For Dockerized Next.js apps, prefer standalone output when the repository is already using standalone images.
- Copy only the runtime output, static assets, public assets, and required package files into production images.
- Treat middleware, route handlers, server actions, and edge/runtime settings as production-sensitive.

## Hono Rules

- Keep route definitions, handlers, validation, and OpenAPI metadata close together when that is the existing pattern.
- Validate request input at the boundary.
- Return typed response shapes.
- Keep auth and tenancy checks explicit.
- Do not leak provider errors, secrets, tokens, or raw internal stack traces to clients.
- Keep CORS behavior deliberate and environment-aware.

## Prisma Rules

- Treat schema and migration changes as high risk.
- Never edit applied migrations casually.
- Generate Prisma client artifacts through the repo’s existing command.
- Keep database access server-side only.
- Prefer explicit transactions for multi-write invariants.
- Make destructive migrations reversible or provide a clear rollback/backup note.
- Check that Docker builds include the Prisma schema, migrations, generated client artifacts, and runtime engines needed by the deployment target.
- Do not deploy schema changes without considering old-code/new-code compatibility.

## Clerk Rules

- Keep authentication checks server-side for protected APIs.
- Do not trust client-provided user IDs, organization IDs, roles, or subscription state.
- Verify webhook signatures using the provider’s official approach.
- Keep auth-related env vars out of client bundles unless they are intentionally public.
- Treat changes to session handling, middleware, redirects, and organization tenancy as production-sensitive.

## Stripe Rules

- Verify webhook signatures.
- Preserve raw request body handling where required for signature verification.
- Make webhook handlers idempotent.
- Store and check provider event IDs when processing side effects.
- Do not trust client-provided prices, subscription status, customer IDs, or payment status.
- Keep billing state transitions explicit and testable.
- Treat payment, subscription, invoice, and entitlement logic as high risk.

## Quality Gates

- Prefer `bun ci` in CI for lockfile fidelity.
- Prefer `biome ci .` in CI and `biome check .` locally.
- Keep TypeScript checks explicit through the repository’s declared checker.
- If the repo uses `tsgo --noEmit`, do not silently replace it with another checker.
- Run Knip as a regression guard when configured.
- Use strict Knip enforcement only after the current signal is clean enough to avoid noisy false failures.
- Keep SonarQube optional behind repository secrets or variables so forks and unconfigured repositories do not fail.
- Never remove a check just to make CI green.
- Fix the source issue, narrow the check correctly, or gate optional external services behind clear configuration.

## GitHub Actions Rules

- CI must be safe for pull requests from forks.
- Do not expose secrets to untrusted pull request workflows.
- Keep permission scopes minimal.
- Use concurrency where it prevents duplicate waste without canceling important release work.
- Pin or deliberately version external actions according to repo convention.
- Separate required local checks from optional external integrations.
- Cache dependencies and build outputs carefully, not secrets or generated local state.
- Keep release, deployment, and image-push jobs protected by branch, tag, environment, or credential gates.

## Docker And Image Rules

- Keep Docker contexts small with `.dockerignore` and Dockerfile-specific ignore files.
- Use multi-stage builds.
- Install dependencies before copying source when it improves cache reuse.
- Copy only what the runtime needs.
- Keep production images free of test files, source maps unless intentionally needed, local env files, docs, coverage, VCS metadata, and debug tooling.
- Run production containers as non-root where the base image and app allow it.
- Keep health checks, ports, users, working directories, and entrypoints explicit.
- Use BuildKit cache mounts deliberately.
- Do not cache or bake secrets into images.
- Validate Docker Compose config after changes.
- If image arguments, exposed ports, env vars, or runtime commands change, update Compose, CI, deployment docs, and README together.

## Docker Rules For This Stack

- Next.js runtime images should use standalone output when the app is configured for standalone deployment.
- Bun service runtime images should install production dependencies only, unless the runtime genuinely needs dev tooling.
- Prisma runtime images must include generated client artifacts and any required engine files.
- Monorepo service images should be pruned to the target package and its transitive runtime dependencies.
- Avoid copying the full monorepo into the final runtime stage.

## CI And Static Analysis

- CI should install with the lockfile.
- CI should run formatting/linting, type checks, tests, builds, Docker validation, and Docker Compose config validation when relevant.
- SonarQube should be optional unless the repository is explicitly configured to require it.
- Quality tools should fail for real regressions, not for missing secrets in forks.
- Keep CI output actionable. Prefer clear script names and focused failure surfaces.

## Security Rules

- Never log secrets, auth tokens, session tokens, cookies, raw payment payload secrets, provider signing secrets, or private user data.
- Do not commit `.env` files or local credentials.
- Do not weaken auth, CORS, CSRF, webhook verification, or permission checks without explicitly calling it out.
- Treat dependency upgrades as security-sensitive when they affect auth, payments, database, runtime, or build tooling.
- For user-controlled input, validate at the boundary and encode at the sink.
- Keep server-only provider SDKs out of client bundles.

## Observability And Operations

- Preserve existing logging and telemetry conventions.
- Add safe metadata when it helps debug production behavior.
- Do not add noisy logs in hot paths without a reason.
- Include correlation IDs, request IDs, provider event IDs, or job IDs when the repo already uses them.
- For production-risk changes, identify how the team will know the change works after deployment.

## Documentation Rules

Update documentation when behavior changes.

Update the relevant docs for:

- New commands
- Changed ports
- Changed environment variables
- Changed Docker build args
- Changed deployment shape
- Changed CI expectations
- Changed auth or billing behavior
- Changed database migration flow
- Changed package boundaries
- New operational risks or rollback steps

Prefer README updates for user-facing setup and operational changes. Prefer ADRs for hard-to-reverse architectural decisions. Prefer inline comments only when they explain a non-obvious local choice.

## Done Criteria

A change is not done until the relevant items are true:

- Manifest and lockfile agree.
- Formatting and linting pass.
- Type checks pass.
- Tests pass or the missing tests are explicitly justified.
- Build passes for affected apps/packages.
- Prisma generation and migration checks pass when database code changed.
- Docker build or Docker Compose config validation passes when container behavior changed.
- CI remains safe for pull requests from forks.
- Optional external services such as SonarQube, Docker Hardened Images, Stripe, Clerk, or deployment providers are gated by credentials and documented.
- README, ADRs, or operational docs are updated when behavior changed.
- The final diff has been inspected.
- The handoff states what changed, what was verified, and what remains risky.

## Handoff Format

Use this format at the end of the work:

- Changed:
  - Brief list of concrete changes.
- Verified:
  - Commands run and results.
- Not run:
  - Commands not run and exact reason.
- Risk:
  - Remaining risk, rollback notes, or production watch points.
- Docs:
  - Documentation updated or why none was needed.
