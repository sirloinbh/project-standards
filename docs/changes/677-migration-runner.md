# #677 One managed migration runner

## Change

- `templates/app/backend/src/standard/migrations.ts` (managed, new): the runner library in English. It takes one `Client` connection (not a Pool), takes the advisory lock key as a parameter, strips the BOM from the SQL it sends (not only from the checksum), and rejects a file that cannot run in the runner's transaction (`CONCURRENTLY`, `VACUUM`, `CREATE`/`DROP DATABASE`/`TABLESPACE`, `ALTER SYSTEM`, or its own `BEGIN`/`COMMIT`). Keywords inside comments and strings do not count.
- `templates/app/backend/src/standard/migrate.ts.tmpl` (managed, new): the CLI. `--status` reports only; any other flag exits 2 without touching the database. The lock key is `581_000` plus the registry slot, so no two apps share one (it replaces 581_003 vs 581_012).
- `scaffold/app/backend/src/migrate.ts` is now a one-line entry that imports `./standard/migrate.js`, so `node dist/migrate.js` in `deploy/remote-deploy.sh.tmpl` and `npm run db:migrate` keep working. `scaffold/app/backend/src/migrations.ts` and its test are removed.
- `scripts/test/backend-migrations.test.mjs`: the scaffold test ported, plus BOM, transaction-incompatible files, the lock key, and the statement order.
- `docs/conventions/database.md` and `scripts/test/scaffold.test.mjs` follow the move. The sync snapshot is updated.

## Reason

Six apps copied the runner and drifted (lock keys, `--status` missing, unknown flags applying, BOM sent to PostgreSQL). cert-manager and dev-career-portfolio had none while the deploy script runs `node dist/migrate.js`.

## Check before merging / follow-up

- Apps adopt it through their sync PR: delete the local `migrations.ts` and its test, and make `backend/src/migrate.ts` the one-line entry (`docs/conventions/database.md` section 8). A migration that uses a transaction-incompatible statement now fails with its file name instead of failing halfway.
- `docs/directory-rules.md` still lists `migrations.ts  migrate.ts` under `backend/src/`; it is not an owned path, so the coordinator is asked to fix it.

## Verification

- `node --test scripts/test/backend-migrations.test.mjs`: 10 pass. `npm test`: 676 pass.
- `npm run check`: see the PR.
