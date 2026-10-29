# Prisma 8 rc.21 upgrade and deployment

Upgraded on 2026-10-29 to `@prisma/orm-postgres` `8.0.0-rc.21` and `prisma`
`8.0.0-rc.28`. The façade and unified CLI have separate release sequences;
the lockfile keeps the façade's internal ORM packages on rc.21.

## What changed

The published target package's cumulative recipes were checked for all four
transitions, rc.17 → rc.18 → rc.19 → rc.20 → rc.21. The official
`remove-nocheck` converter updated the emitted contract, its historical
snapshot, snapshot directory, migration endpoints, and refs together. The
subsequent `expand-type-aliases` converter reported no applicable aliases.

| Artifact                | Before                                                             | After                                                              |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Storage hash            | `65a2e3fdd7d073ff6b91467777940a26a791ca4982ed6903bca77195f39927e7` | `66e9d562ab1892e4a2ec1137b5b9418c4e93f38e847eef96d88482a99eeb68fb` |
| Baseline migration hash | `eee3ab364c5a420ecfde015bade12b137965a4677d3f46ffa6772bf75ea35f2c` | `1cb52c78e2b34977c27c62979a3f87ca36843ec0602d2539c3a7376f1f26355c` |
| Profile hash            | `3916f444a8a17ad749191acf9e08dad97d1a327b88c2f1d45d12f240296aa8b2` | Unchanged                                                          |

The current generated contract and types were re-emitted with the target CLI.
The historical snapshot retains its original generated type shape, with the
removed, unused `Timestamp`, `Timestamptz`, `Time`, and `Interval` imports
removed as the rc.21 recipe requires. The baseline migration was self-emitted
with the target version to pick up stronger PostgreSQL checks for tables,
indexes, uniqueness, and foreign keys. Its 12 operation IDs and DDL execution
blocks are identical to the saved old baseline; the checks and metadata changed.

Application changes:

- The client now constructs a typed contract with
  `contractFromJson<Contract>(contractJson)` and passes it to `postgres({ contract,
  pg: pool })`.
- `Timestamp(3)` became `TimestampTemporal(3)` in the schema. The underlying
  Temporal codec and stored timestamp values are unchanged.
- `String[] @noCheck(elementNotNull)` became `String?[]` for product sizes and
  colors. PostgreSQL already permits null elements in these columns. The schema
  now describes that storage shape accurately, without adding a constraint or
  rewriting existing rows.
- The product serializer omits null array elements at the API boundary. Public
  product records retain `string[]`, their existing order, and UTC timestamp
  strings. An all-null stored array becomes an empty API array; the serializer
  never invents a purchasable variant or changes stored inventory.

The driver's rc.21 `DateStyle=ISO` requirement and caller-owned pool lifecycle
remain compatible with the application's PostgreSQL connection and shutdown
path. CLI commands still use exit codes; rc.20's change from implicit JSON to
plain piped output requires no script parser migration here.

## Existing databases: explicit one-time signing

This format change assigns a new storage hash to the same physical schema.
An existing database's marker still contains the old hash. Normal deployment
must fail until an operator verifies and signs the converted contract; do not
add automatic signing to `db:deploy` or a deployment job.

Stop old application writers and take a recoverable backup. Install this
revision's locked dependencies, set `DATABASE_URL` to the intended database,
and run from the repository root:

```sh
bun run --cwd packages/product-db db:generate
bun run --cwd packages/product-db db:validate
bun run --cwd packages/product-db db:adopt
bun run --cwd packages/product-db db:deploy
bun run --cwd packages/product-db db:verify
```

`db:adopt` runs strict schema-only verification before `prisma db sign`. A
schema mismatch must be resolved before signing. The expected converted
baseline is `66e9d562ab1892e4a2ec1137b5b9418c4e93f38e847eef96d88482a99eeb68fb`.
The current graph has one baseline; after signing this hash, `db:deploy` must
not replay that baseline against existing tables.

Upstream explicitly retains old migration hashes in the database ledger after
this conversion. As a result, `prisma migration status` may no longer label
the old baseline as applied, while still reporting the database up to date.
Do not rewrite or delete that ledger to make the label match. The marker,
verified schema, and reachable target determine subsequent migrations.

For a database that has not applied the target contract, follow the bundled
`stored-contracts-drop-nocheck` instructions and sign the converted snapshot of
its last applied migration with `prisma db sign --contract <migration-name>`.
Do not adopt the latest target against a partially applied or different schema.

## Fresh databases

Fresh installations use the reviewed converted baseline directly:

```sh
bun run --cwd packages/product-db db:deploy
bun run --cwd packages/product-db db:verify
```

The deployment creates the product schema and the separate inventory schema.
No adoption/signing step is required. Repeated deployment must succeed without
recreating tables or altering business data.

## Verification

The upgrade checks include deterministic contract emission, migration-graph
validation, type checks for the database package and product service, serializer
regressions for mixed and all-null arrays, and existing timestamp/timezone and
inventory boundary tests. The database integration suite additionally inserts
real nullable PostgreSQL arrays and checks both product detail and list responses.

Both deployment paths passed on isolated PostgreSQL 18.6 databases on
2026-10-29:

- **Existing database:** deployed the old rc.17 baseline, then seeded two
  products, including null-containing arrays, and three outbox events covering
  pending, publishing, and published states. Strict schema verification and
  signing succeeded with the converted hash. Deployment reported no operations;
  verification passed. Category, product, outbox, and original migration-ledger
  JSON were byte-for-byte identical before and after adoption and deployment.
- **Fresh database:** applied all 12 baseline operations, recorded the converted
  marker, and passed database verification.

These rehearsals used disposable databases. No application database was signed
or migrated. The full repository checks also passed all 14 workspace type checks
and 215 unit tests against the installed target packages.

Repeated deployment on both databases reported no operations. All 19 integration
tests passed against disposable PostgreSQL, MongoDB, and Kafka, including the
real nullable-array product detail/list case. The original old-schema nullable
fixture also returned valid public arrays and its unchanged UTC timestamp through
the upgraded product service. All five application images built and passed
restricted runtime verification on both ARM64 and AMD64.

Rollback requires the old application, matching contract marker, and matching
ledger. Restore the corresponding database backup; changing package versions
alone does not undo this contract-format conversion.

## Sources

- Published `@prisma/orm-postgres@8.0.0-rc.21` package: bundled
  `skills/prisma-8/references/upgrade-app.md` and all four transition recipes.
- [rc.18 release and app recipe](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.18).
- [rc.19 release and app recipe](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.19),
  especially `stored-contracts-drop-nocheck`, `psl-nocheck-removed`,
  `client-takes-contract-value`, and the PostgreSQL postcheck changes.
- [rc.20 release and app recipe](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.20).
- rc.21's published `instructions.md`, especially
  `psl-temporal-type-renames`, `branded-time-types-removed`,
  `date-style-iso-required`, and `close-ends-the-client-not-your-pool`.
