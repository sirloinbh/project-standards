# #967 Give the shared services the daily server report

The daily report (`deploy/report.sh`, #285, with the API error count and `REPORT_ERROR_LIMIT` from #636) reached only the apps: its templates were in `templates/app/deploy/`, which the `service` profile does not use. sirloinbh/shared-auth#11 waited for it.

## Change

| File | Content |
|---|---|
| `templates/deploy/deploy/report.sh.tmpl`, `report.service.tmpl`, `report.timer.tmpl` | Moved from `templates/app/deploy/`, so both the `app` and `service` profiles receive them. The script was already generic (`/opt/<name>`, the `api` compose service, `.deployed`, `notify.sh report`); one comment now says "this project's container memory" instead of "this app's" |
| `scripts/lib/vars.mjs` | Services install `backup restore-check report` (was `backup restore-check`) |
| `templates/deploy/deploy/install-backup.sh.tmpl` | The comments name the report timer for both groups and the health timer as apps only |
| `scripts/test/service-deploy-templates.test.mjs` | Services receive the three report files, install the report unit, and their rendered `report.sh` runs with fakes: `ok` with no errors, `fail` with `errors=1 [<id> 500 /api/health]`, reading the `api` container |
| `scripts/test/deploy-report-helpers.mjs` | `reportRun` takes another target's rendered script (`source`, `name`) |
| `scripts/test/fixtures/sync-snapshot.json` | shared-auth and shared-ai gain `deploy/report.service`, `report.sh`, `report.timer`; the app lists are unchanged |
| `docs/adr/0021-error-alerts-from-logs.md`, `docs/adr/0029-standards-delivery-per-repo-group.md` | The report's template path and the service row |

## What was decided

- **Move, not copy.** Both groups get the same file from one source; a copy in `templates/service/` would drift.
- **No service-specific rendering.** Both services run their API as the compose service `api` and write the same `requestLog` JSON lines, and `remote-deploy.sh` (already shared) saves the replaced container's error lines. So the app script is correct for them as it is.
- **The health timer stays app-only.** It is outside #967 and shared-auth#11.
- **Apps' rendered files change only in comments** (`install-backup.sh` lines 2, 3 and 10; `report.sh` line 4). The old line 10 ("the shared services have only the first two") would be wrong after this change, and it is in the shared template.
- Installing the timer on the server stays a user step: `sudo bash /opt/<service>/deploy/install-backup.sh` after the sync PR is merged and deployed.

## Checks

- `node --test scripts/test/service-deploy-templates.test.mjs`: 9 passed.
- `UPDATE_SNAPSHOT=1 npm test`: 611 passed, 5 skipped, 0 failed. The snapshot diff adds only the three report files to the two service targets.
- `npm run check`: see the PR.
