# 695: standards-check enforces the compose deploy contract

## What changed

- `scripts/standards-check.mjs` (`checkComposeDeploy`, new group `deploy contract`): for `app` profile repositories, `compose.yaml` must
  - tag the images `<db>-backend:${IMAGE_TAG}` and `<db>-frontend:${IMAGE_TAG}` (rollback needs this),
  - publish the web port as `${WEB_BIND}:${WEB_PORT}:80`,
  - not mount `database/migrations` into `docker-entrypoint-initdb.d`,
  - write `$$POSTGRES_USER` / `$$POSTGRES_DB` in the healthcheck (single `$` is expanded by compose),
  and the root `package.json` must have a `db:migrate` script.
- `scaffold/app/compose.yaml`: removed the initdb mount, so a new local DB records migration history through the runner. The healthcheck already used `$$POSTGRES_USER`.
- `scripts/test/standards-check.test.mjs`: the fixture follows the contract; a test breaks each rule once.

## Decision

The rules are failures, not warnings, as the issue asks: a repository that breaks them cannot roll back or migrate on deploy. Apps that do not follow the contract yet (life-journal, money-ledger, cert-manager, dev-career-portfolio, plan-routine, and the initdb mount in all apps) fail `standards-check` after the next sync until #710 is done, and the compliance report lists them.

`docs/conventions/database.md` still describes the initdb first-run behavior; it stays accurate until the apps adopt (#710) and is outside this lane's paths.

## Tests

`npm run check`.
