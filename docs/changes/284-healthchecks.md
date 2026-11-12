# #284 Report app health, backups, and auto deploy results to healthchecks.io from server timers

## Decision (#257, user 2026-10-27)

The firewall is open only to allowed IPs, so outside monitoring cannot reach the server. The server sends signals to healthchecks.io, and an email arrives when signals stop or a failure signal arrives. If the server stops, the signals stop too, so we can tell.

## Change

| File | Content |
|---|---|
| `templates/app/deploy/notify.sh.tmpl` | `ping <check> ok\|fail [message]` (body up to 10 KB, 3 retries, the caller is unaffected even on failure), `health` (checks `/api/health`, then signals). 5 checks: health, deploy, backup, restore, report. Addresses come from `HEALTHCHECK_URL_*` in the server `.env`. Addresses are not printed |
| `templates/app/deploy/health.{service,timer}.tmpl` | Runs `notify.sh health` every 5 minutes |
| `templates/app/deploy/backup.sh.tmpl` | One exit handler does both the restore check container cleanup and the signal. Daily dump goes to backup, restore check goes to restore. The pre-deploy dump sends no signal |
| `templates/app/deploy/autodeploy.sh.tmpl` | A deploy signal on every run that makes a decision: latest, waiting for CI, and deploy success are ok; CI failure, deploy failure, and waiting on a failed commit are fail |
| `templates/app/deploy/install-backup.sh.tmpl` | Also installs the health timer |
| `scripts/test/deploy-templates.test.mjs`, snapshot | With fake curl and notify, checks signal address, body, `/fail`, address non-exposure, check names, backup and restore signals, and the auto deploy signal points |
| `docs/runbooks/deploy.md`, `docs/user-steps.md` | `.env` keys, a table of period and grace per check, and user step 11 |

## Limits

- The healthchecks.io free plan has 20 checks. 8 apps × 5 checks (40) is more than that, so we create them starting with the apps in operation.
- Real signals will be checked after the user creates the account and checks (#286) and they are applied to the server.

## Verification

- `node --test scripts/test/deploy-templates.test.mjs`: 19 of 20 passed, 1 skipped (no python3, an existing test)
- `npm run check`: 459 of 460 tests passed, 1 skipped, 0 failed
