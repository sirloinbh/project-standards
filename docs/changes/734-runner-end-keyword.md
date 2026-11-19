# #734 Do not reject CASE ... END lines in the migration runner

## Change

- `templates/app/backend/src/standard/migrations.ts`: `END` is no longer one of the words that mark a file as using its own transaction control. A `CASE ... END` expression with `END` at the start of a line, as in workout-memo `016_cardio_goals.sql`, made `readMigrations` refuse a valid file. `BEGIN`, `COMMIT`, `ROLLBACK` and `START TRANSACTION` are still rejected.
- `scripts/test/backend-migrations.test.mjs`: a `CASE ... END` case.

## Reason

Found while adopting the runner in the apps (#698): the new check ran against every app's `database/migrations` and flagged this one file.

## Verification

- `node --test scripts/test/backend-migrations.test.mjs`: 10 pass; `readMigrations` accepts all 8 apps' migration folders.
- `npm run check`: see the PR.
