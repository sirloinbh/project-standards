# DB migration rules

Every app changes the PostgreSQL schema only through `database/migrations/NNN_<description>.sql` files and applies them with the same runner (`npm run db:migrate`). The runner was built on workout-memo `backend/src/migrations.ts`, and new projects get it from the scaffold (`scaffold/app/backend/src/migrations.ts`, `migrate.ts`) (#27).

## 1. File numbering rules

- Location: `database/migrations/` in the umbrella repo. It is split out to the sub-repo `<project>-db` ([directory rules](../directory-rules.md)).
- Name: `^(\d{3})_[a-z0-9_]+\.sql$`. A three-digit number, an underscore, and a description of lowercase English letters, digits, and underscores. Examples: `001_initial.sql`, `014_biceps_triceps.sql`.
- Numbers start at 001 and increase one at a time with no gaps. Do not use the same number in two files.
- Do not create a new file with a number lower than an already applied file. If two branches use the same number, the one merged later changes to the next number.
- Files that are not `.sql` (for example, `README.md`) are ignored by the runner. A `.sql` file with a wrong name format causes a failure.

## 2. File writing rules

- **Write it to be safe to run again.** Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `INSERT … ON CONFLICT`. This is because, on an empty volume, Docker initialization (`/docker-entrypoint-initdb.d`) first runs all files without recording them, and then the runner applies the same files again and records them.
- **One file is one transaction.** The runner wraps each file in `BEGIN` and `COMMIT`. Do not use statements that cannot run inside a transaction (`CREATE INDEX CONCURRENTLY`, `VACUUM`, and so on). Do not write `BEGIN` or `COMMIT` in the file yourself.
- **Do not use psql-only commands.** The runner sends SQL through the `pg` driver. psql meta commands such as `\i`, `\set`, and `:'variable'` do not work.
- **Save as UTF-8.** Line endings (CRLF or LF) and the UTF-8 BOM do not affect the checksum.
- **Do not edit an applied file.** Add what you want to change as a new numbered file. Changing even one character in a comment changes the checksum and the runner stops.
- **Preserve the meaning of existing data.** When adding a column, write in the same file a `DEFAULT` or `UPDATE` that sets the values of existing rows.

## 3. Applied-records table

The runner creates it the first time it runs. App code neither reads nor writes this table.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,                 -- file name (e.g. 001_initial.sql)
  checksum text NOT NULL,                -- SHA-256 (hex) of the content with line endings and BOM normalized
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

- Applying one file and inserting its record row are committed in one transaction. On failure, only that file is rolled back and the runner stops. Files applied earlier stay recorded.
- The runner takes an advisory lock (fixed key `581_003`, same as workout-memo). Even if CI and a local command run at the same time, they apply one at a time.
- In the following cases, it fails without applying anything.
  - A recorded file is missing.
  - A recorded file's checksum differs (the content changed).
  - There is a new file with a number lower than the last recorded file.
  - The name format is wrong or a number is duplicated.
- The first run on a DB without the records table (a DB previously applied with psql) applies everything again from 001 and records it. That is why the "safe to run again" rule in section 2 is needed.

## 4. How to run

| Situation | Command | Note |
|---|---|---|
| Local | `npm run db:migrate` | From the umbrella repo root. Uses `DATABASE_URL` from `.env` |
| Local check | `npm run db:migrate -- --status` | Prints only the applied and pending lists and errors. Does not change the DB |
| First run on an empty volume | Docker initialization → `npm run db:migrate` | compose mounts `database/migrations` to `/docker-entrypoint-initdb.d` |
| Shared CI | Section 5 below | The verify and e2e jobs of `reusable-app-ci.yml` |
| Production deploy | The deploy script applies after the dump | [Deploy runbook](../runbooks/deploy.md) section 3, step 4 |

- Do not pass SQL through a PowerShell pipe (`Get-Content … | psql`). Windows PowerShell 5.1 corrupts Korean text. The runner has Node read the file directly as UTF-8.

## 5. The migration step in shared CI

The verify job and e2e job in `.github/workflows/reusable-app-ci.yml` prepare the test DB with the same script.

1. Apply `database/migrations/*.sql` once in file name order with `psql -v ON_ERROR_STOP=1`. This is the same behavior as Docker initialization on an empty volume.
2. If the root `package.json` has a `db:migrate` script, run the runner. It re-applies the files already applied in step 1 and records them, so it also confirms that running again is safe.
3. If there is no `db:migrate`, apply once more with psql and leave a warning (`::warning`). This is so CI does not break for apps that have not adopted the runner yet (compatible with the earlier behavior).

Whether the runner exists is decided by the script name. There is no per-app CI input. When all 8 apps have adopted the runner, delete the step 3 branch.

## 6. Rollback policy

- **Do not use rollback (down) files.** Only go forward. Fix a wrongly applied change with a new numbered file that corrects it.
- **If data must be rolled back, restore from a backup.** A production deploy makes a DB dump before migrating. Restore by following the [backup and recovery runbook](../runbooks/backup-restore.md).
- **An app rollback does not roll back the schema.** A deploy rollback only restarts with the previous image. So write new files so the previous version of the app keeps working (include a `DEFAULT` when adding a column; drop a column or table in a separate file after an app that no longer uses it has been deployed).
- **Failed application:** Check the file name and cause in the error message. The failed file was not recorded, so after fixing the cause, running again continues applying from that file. If it is a data problem, make a backup first.
- **Checksum mismatch:** Restoring the file to its original content in git fixes it. Move what you wanted to change into a new file. Do not edit the checksum in the records table by hand.

## 7. Differences from the workout-memo way

The rules and the records table are the same as workout-memo's. So even if the workout-memo DB switches to the standard runner, there are no files to apply again.

| Item | workout-memo (`backend/src/migrations.ts`, `migrate.ts`) | Standard (scaffold) |
|---|---|---|
| File name and number checks | `^(\d{3})_[a-z0-9_]+\.sql$`, duplicate numbers fail | Same |
| Records table | `schema_migrations(name, checksum, applied_at)` | Same |
| Checksum | SHA-256 after normalizing line endings and BOM | Same |
| Order check | A new file before the last recorded file fails | Same |
| Lock | advisory lock fixed key `581_003` | Same |
| Transaction | `BEGIN` and `COMMIT` per file, only that file is `ROLLBACK`ed on failure | Same |
| DB connection | Creates a `pg` `Pool` and borrows one connection | A single `pg` `Client`. It uses only one connection, so no pool is needed |
| Connection type | `PoolClient` | `ClientBase` (the common type of `Client` and `PoolClient`). It can also be passed to workout-memo code as is |
| Unit test | `backend/test/migrations.test.ts`. Checks that the repo has 9 or more files and that the Korean seed in 001 is read | The same rules test. For repo files, it only checks that they start with 001 (a new project has one file) |
| CI | `npm run db:migrate` once. e2e runs the same command inside the Playwright container | Apply once with psql, then `db:migrate` (section 5). It also confirms that running again is safe |
| Docs | `database/README.md` has accumulated per-file apply instructions (including the psql procedure from before the runner) | `database/README.md` has only general rules. Per-file descriptions go in the comment at the top of the SQL file |

The other 7 apps have no runner, and each repo's CI applies all files with a `psql` loop. There is no records table. study-log runs the same loop twice to confirm that running again is safe. As checked on 2026-10-22 against each app's local copy, the migrations of all 7 apps are written with `IF NOT EXISTS`, so it is safe to re-apply from 001 on the first runner run.

## 8. Adopting the runner in existing apps

Proceed through each app repo's issue and PR. Do not push directly to app repos from the center.

1. Copy the scaffold's `backend/src/migrations.ts`, `backend/src/migrate.ts`, and `backend/test/migrations.test.ts`.
2. Add `"db:migrate": "tsx --env-file-if-exists=../.env src/migrate.ts"` to `backend/package.json` and `"db:migrate": "npm run db:migrate -w backend --"` to the root `package.json`. `pg` and `tsx` are already dependencies, so no new packages are needed.
3. On the local DB, view the pending list with `npm run db:migrate -- --status` and record the baseline with `npm run db:migrate`.
4. For the production DB, the deploy script records it with the same command after making a dump.
5. Shared CI uses the runner automatically once `db:migrate` exists (section 5). There is no need to change the CI settings separately.
