# #44 Source files for registry, versions, and sync config, and the conflict check

## Change

| File | Content |
|---|---|
| `scripts/lib/schema.mjs` | A JSON Schema validator with no external packages. It supports only the keywords this repo uses, and raises an error on an unsupported keyword instead of silently skipping it |
| `registry/projects.json`, `projects.schema.json` | Slot, ports, DB, repo name, feature flags, and project-specific skills of the 8 apps. Domain and AWS prefix are `null` (undecided) |
| `registry/platform.json`, `platform.schema.json` | Port formula, reserved ports, root domain (`null`), AWS region `ap-northeast-2` (the default in workout-memo `infrastructure/variables.tf`) |
| `versions.json`, `versions.schema.json` | Node 24.21.0, npm 11.19.0, PostgreSQL 17, 3 Docker images, Terraform `>= 1.6.0`, commit SHAs of 4 external Actions, option A packages (`null` because not released yet) |
| `sync.config.json`, `sync.config.schema.json` | app and infra profiles, 9 targets, `maxRollout` 0 |
| `scripts/lib/registry.mjs`, `scripts/registry-check.mjs` | Schema check and cross-file checks: duplicates of slot, name, repo, DB, service address, and AWS prefix; global duplicates of all ports; the port formula; reserved ports (across all 99 slots); sync targets match the registry; and warnings for expired allowed differences |
| `scripts/gen-docs.mjs`, `docs/projects.md` | Generates the project overview document from the registry. `--check` fails if the committed file is stale |
| `package.json` | No dependencies; only the scripts `npm run test`, `registry:check`, `docs`, `docs:check`, and `check` |
| `scripts/test/*.test.mjs` | 24 tests for the validator, registry check, and document generation |

## Values decided

- External Actions are pinned to the commit that the major tag the downstream repos currently use points to. All four are more than 14 days past their release.

  | Action | Version | Commit date |
  |---|---|---|
  | actions/checkout | v4.4.0 | 2026-07-16 |
  | actions/setup-node | v4.4.0 | 2025-04-02 |
  | actions/upload-artifact | v4.6.2 | 2025-03-19 |
  | hashicorp/setup-terraform | v3.1.2 | 2024-08-19 |

- The exact Terraform CLI version is not decided yet (`terraform.cli: null`). For now `setup-terraform` installs the latest version. It will be pinned in #71, which creates the infrastructure CI.
- The test DB name is `<DB name>_test` (design.md 6.2).
- In `features`, only workout-memo has `e2e`, `openapi`, and `contract` as `true`. The basis is workout-memo's `playwright.config.ts`, `docs/openapi.json`, and `shared/contract.ts`.

## Checks

- `npm run check`: 24 tests passed, `registry-check: ok`, `docs/projects.md: up to date`
- The local Node is v22.17.0. It differs from the standard version 24.21.0, so the central scripts use only APIs that also work on Node 22. `engines` in `package.json` is also `>=22`. CI runs with 24.21.0 (#71).
