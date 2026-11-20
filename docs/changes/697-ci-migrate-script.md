# #697 Move the CI migration step to a vendored script

`reusable-app-ci.yml` holds the same 14-line migration block in the verify and e2e jobs, kept equal by a test, with a psql-only fallback and a warning for apps without `db:migrate`. The goal is one vendored script and no fallback.

## Two stages

The private apps call the reusable workflow at `@main`, so the moment the workflow runs `bash .standards/ci-migrate.sh`, every app's CI needs that file. Doing it in one PR would break all 8 apps' CI until their sync PRs merge. So:

1. **Stage 1 (this PR):** add the script and vendor it to the `app` profile. The workflow is unchanged.
2. **Stage 2 (follow-up PR, after every app has `.standards/ci-migrate.sh` on main):** both jobs run `bash .standards/ci-migrate.sh`, the inline blocks and the no-runner fallback are removed, and `workflows.test.mjs` checks that no inline block is left. The inlined public copy gets the same step.

## Change (stage 1)

| File | Content |
|---|---|
| `scripts/ci-migrate.sh` | Applies every `database/migrations/*.sql` once with psql without recording (the Docker init order check), then `npm run db:migrate` (records them in `schema_migrations`). No fallback |
| `templates/index.json` | Vendors it as `.standards/ci-migrate.sh` to the `app` profile only (shared-auth and shared-ai use the service workflow) |
| `scripts/test/workflows.test.mjs` | The script keeps the psql-then-runner order, has no fallback and `set -euo pipefail`, and is vendored to the app profile only |
| `scripts/test/fixtures/sync-snapshot.json` | The 8 apps receive the new file |

## What was decided

- **The fallback can go in stage 2** because #698 gave all 8 apps the runner (checked: `db:migrate` is in `package.json` on main of every app; shared-auth and shared-ai do not use this workflow).
- The e2e-visual job stays as it is: its Playwright image has no psql, so it only runs `npm run db:migrate`.

## Checks

- `node --test scripts/test/workflows.test.mjs`, `bash -n scripts/ci-migrate.sh`, `npm run check` (see the PR).

## Stage 2 (done)

Checked 2026-11-20: `.standards/ci-migrate.sh` is on main of all 8 apps. Both `DB migration` steps in `reusable-app-ci.yml` (verify and e2e) now run `bash .standards/ci-migrate.sh`; the inline blocks and the no-runner psql fallback with its warning are gone. The e2e-visual job still runs only `npm run db:migrate` (no psql in its image). `workflows.test.mjs` now requires both steps to be the script call and no inline `psql "$DATABASE_URL"` to remain. Apps pin the workflow to the synced central sha, so an app picks this up with its next sync PR, which also carries the script.
