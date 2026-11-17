# #636 Error count in the daily report

## Change

| File | Content |
|---|---|
| `templates/app/deploy/report.sh.tmpl` | Counts `"level":"error"` lines in `docker compose logs --no-log-prefix --since 24h api` plus the saved pre-deploy file, adds `errors=<N>` to the report line, lists up to 5 `<requestId> <status> <path>` entries when N > 0 (never the error message), and sends `fail` when N is over `REPORT_ERROR_LIMIT` (server `.env`, default 0). The saved file is emptied after a send |
| `templates/app/deploy/remote-deploy.sh.tmpl` | `save_api_errors` appends the running api container's error lines of the last 24 hours to `.errors-before-deploy.log` just before `docker compose up -d`, in the deploy path and in `start` (rollback and the restore after a failed deploy). It skips quietly when no api container runs and never fails the deploy |
| `scripts/test/deploy-templates.test.mjs`, snapshot | Cases: 0 errors, at and over the limit, the 5-entry cap without message text, the saved file counted and emptied, remote-deploy saving and not failing without a container |
| `docs/logging.md`, `docs/env-conventions.md`, `docs/runbooks/deploy.md` | How the alert works, how to grep a request ID, `REPORT_ERROR_LIMIT` |

An unexpected 500 writes two error lines with one request ID. Both count, and the ID is listed once with the status and path of the request line.

## Why

ADR-0021 (#554): nothing told the owner about a 500 on one route while `/api/health` stays green. A deploy replaces the api container and Docker drops its logs, so its errors are saved first.

## Verification

- `node --test scripts/test/deploy-templates.test.mjs`
- `npm run check`
