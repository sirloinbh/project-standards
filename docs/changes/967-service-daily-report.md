# #967 Give the shared services the daily server report

The daily report (`deploy/report.sh`, #285, with the API error count and `REPORT_ERROR_LIMIT` from #636) reached only the apps: its templates were in `templates/app/deploy/`, which the `service` profile does not use. sirloinbh/shared-auth#11 waited for it.

## Change

| File | Content |
|---|---|
| `templates/deploy/deploy/report.sh.tmpl`, `report.service.tmpl`, `report.timer.tmpl` | Moved from `templates/app/deploy/`, so both the `app` and `service` profiles receive them. `report.sh` now finds the containers by their compose labels (`docker ps --filter label=com.docker.compose.project=<name>`, plus `service=api` for the error logs, read with `docker logs`) instead of `docker compose ps` and `docker compose logs`, and no longer exports `IMAGE_TAG` (only compose needed it). One comment says "this project's container memory" instead of "this app's" |
| `scripts/lib/vars.mjs` | Services install `backup restore-check report` (was `backup restore-check`) |
| `templates/deploy/deploy/install-backup.sh.tmpl` | The comments name the report timer for both groups and the health timer as apps only |
| `scripts/test/service-deploy-templates.test.mjs` | Services receive the three report files, install the report unit, and their rendered `report.sh` runs with fakes: `ok` with no errors, `fail` with `errors=1 [<id> 500 /api/health]`, reading the `api` container |
| `scripts/test/deploy-report-helpers.mjs` | `reportRun` takes another target's rendered script (`source`, `name`) |
| `scripts/test/fixtures/sync-snapshot.json` | shared-auth and shared-ai gain `deploy/report.service`, `report.sh`, `report.timer`; the app lists are unchanged |
| `docs/adr/0021-error-alerts-from-logs.md`, `docs/adr/0029-standards-delivery-per-repo-group.md` | The report's template path and the service row |

## What was decided

- **Move, not copy.** Both groups get the same file from one source; a copy in `templates/service/` would drift.
- **No service-specific rendering.** Both services run their API as the compose service `api` and write the same `requestLog` JSON lines, and `remote-deploy.sh` (already shared) saves the replaced container's error lines.
- **Labels instead of docker compose (review finding).** The services' `compose.yaml` requires secrets with `${VAR:?}` (shared-auth: `BETTER_AUTH_SECRET`, the OAuth keys, `ALLOWED_EMAILS`; shared-ai: `AI_TOOLS_SIGNING_KEY`). `remote-deploy.sh` reads them from SSM and exports them only during a deploy, so the server `.env` has no copy. A `docker compose ps` or `logs` from the timer would fail interpolation, and the report would quietly say `no containers` and `errors=0`. `backup.sh` already uses the same labels for the same reason (#696). For the apps the output is the same; `docker ps -a` also reads a crashed `api` container's logs, as `docker compose logs` did.
- **The health timer stays app-only.** It is outside #967 and shared-auth#11.
- **Apps' rendered files change**: comments in `install-backup.sh` (the old line "the shared services have only the first two" would be wrong now) and the label lookup in `report.sh` (same report line).
- Installing the timer on the server stays a user step: `sudo bash /opt/<service>/deploy/install-backup.sh` after the sync PR is merged and deployed.

## Checks

- `node --test scripts/test/service-deploy-templates.test.mjs scripts/test/deploy-report.test.mjs scripts/test/deploy-report-errors.test.mjs`: 15 passed. The fake `docker` now fails on any `docker compose` call, and the service test checks the label filters and the `api` container's `docker logs` window.
- `UPDATE_SNAPSHOT=1 npm test`: 611 passed, 5 skipped, 0 failed. The snapshot diff adds only the three report files to the two service targets.
- `npm run check`: exit 0, 611 passed, 5 skipped.
