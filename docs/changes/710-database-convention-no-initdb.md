# 710: database convention no longer describes the initdb first run

## What changed

- `docs/conventions/database.md`: Docker no longer applies migrations on a new volume (the compose files do not mount `database/migrations` into `/docker-entrypoint-initdb.d`, and `standards-check` fails the ones that do, #695). Sections 2, 4 and 5 now say that a new volume gets its schema from `npm run db:migrate`, and why the "safe to run again" rule is still needed (DBs set up before the runner, and the `psql` pass in shared CI).

- `scaffold/app/database/README.md` (line 18): the same correction for new apps. A new volume gets its schema from `npm run db:migrate`, not from Docker.

## Context

This follows the app adoption in #710: life-journal, money-ledger, plan-routine, workout-memo, health-log and study-log dropped the mount. cert-manager and dev-career-portfolio keep it until they adopt the migration runner (#698).

## Tests

`npm run check`.
