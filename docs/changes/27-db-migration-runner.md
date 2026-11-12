# #27 DB migration rules and common runner

## Change

| File | Content |
|---|---|
| `docs/conventions/database.md` | File numbering rules, writing rules (safe to re-run, one transaction per file), the `schema_migrations` record table, how to run, the common CI step, rollback policy, a comparison table with the workout-memo approach, and the procedure for adopting it in existing apps |
| `scaffold/app/backend/src/migrations.ts`, `migrate.ts` | Common runner based on the workout-memo runner. The rules (`migrations.ts`) and the command (`migrate.ts`) are split |
| `scaffold/app/backend/test/migrations.test.ts` | 5 rule tests that need no DB (checksum normalization, name and number checks, pending list, changed, deleted, and out-of-order errors) |
| `scaffold/app/database/README.md` | Runner location, failure conditions, rollback policy |
| `.github/workflows/reusable-app-ci.yml` | The migration steps in the verify and e2e jobs now use the same script: apply once with psql, then run the runner if `db:migrate` exists, otherwise apply once more with psql and warn |
| `scripts/test/workflows.test.mjs`, `scaffold.test.mjs` | Check that the scripts of the two jobs are the same and the psql step comes before the runner, and that the record table, lock key, and naming rules in the runner and the docs match |
| `docs/directory-rules.md`, `README.md` | Runner file names and a link to the rule documents (the three documents in `docs/conventions/`) |

## Decisions

- **The record table matches workout-memo.** The starter runner in the #85 scaffold used the column name `filename` and the lock key `hashtext('schema_migrations')`. I changed these to workout-memo's `name` and the fixed key `581_003`. No app has been created from the scaffold yet, so the change has no impact, and the workout-memo DB has no files to re-apply when it switches to the standard runner.
- **CI decides whether a runner exists by the `db:migrate` script name.** So that CI of the 7 apps without a runner does not break, the psql apply is kept and only a warning is shown. I did not add a per-app CI input. Once all 8 apps have a runner, this branch will be removed.
- **CI applies once with psql first.** This reproduces the Docker init order of an empty volume (apply without recording, then the runner applies again and records), so CI verifies the rule that re-running is safe. For apps without a runner this becomes psql twice, which is the same check as the study-log CI.
- **Before, the e2e job ran `npm run db:migrate` unconditionally.** Enabling e2e in an app without a runner would fail, so it now uses the same script as the verify job.
- **No rollback (down) files.** This matches the existing runbook (`docs/runbooks/deploy.md`), where a deploy rollback does not revert the schema. Data recovery uses the dump taken right before the deploy.

## User decisions (2026-10-22)

- CI applies once with psql and then uses the runner; if there is no runner, it applies once more with psql and leaves a warning. workout-memo, which has a runner, follows the same order.
- Whether a runner exists is decided by the `db:migrate` script name in the root `package.json`. No per-app CI input.
- The document lives in `docs/conventions/database.md`. It is linked in the README rule document list together with `domain.md` and `ux-audit.md` (#169) in the same folder.

## Follow-up work

- Adding the runner to the other 7 apps is done separately as issues and PRs in each app repo (procedure in section 8 of the document).

## Sources

- workout-memo `backend/src/migrations.ts`, `migrate.ts`, `database/README.md`, `.github/workflows/ci.yml`
- The psql loop in study-log and money-ledger `.github/workflows/ci.yml` (study-log loops twice)
- The `database/migrations/*.sql` of the 7 apps (local copies) all use `IF NOT EXISTS`, so re-applying them at the first runner run is safe. All 7 apps already depend on `pg` and `tsx`.

## Checks

- `npm run check` passed: after rebasing onto main (including #171 to #173), 181 of 182 tests passed and 1 was skipped (Codex CLI not installed, pre-existing), `registry-check: ok`, generated docs and tokens up to date, `package-guard: ok`, `check-workflows: ok (8 files)`.
- I copied the scaffold runner to a temporary folder and ran it with workout-memo's installed `node_modules` linked in (nothing installed).
  - `tsc --noEmit` (shared `node-api.json` config) passed
  - `tsx --test backend/test/migrations.test.ts`: 5 tests passed
  - `prettier --check` (shared config) passed
- Not run: `db:migrate` against a real PostgreSQL, and the CI steps. They will be verified in the first sync CI of the app repos.
