# #1030 A failed healthchecks ping counts as failed

- Issue: [#1030](https://github.com/sirloinbh/project-standards/issues/1030)
- Branch: `fix/1030-ping-failure`
- Date: 2026-11-23 (Asia/Seoul)

## Problem

`ping_check` in `notify.sh` printed "could not send" but returned 0. `report.sh` treated that as sent, emptied `.errors-before-deploy.log` and advanced `.report-last-sent`, so that day's API errors were never reported (#636).

## Change

- `templates/deploy/deploy/notify.sh.tmpl`: `ping_check` returns 1 when curl fails. `notify.sh ping` therefore exits 1; `health` adds `|| true` to its pings, so its own exit code still reflects only `/api/health`. A check without a URL still returns 0. `autodeploy` and `backup` already use `|| true`.
- Tests: `deploy-notify.test.mjs` (exit codes), `deploy-report.test.mjs` (a failed ping keeps the saved lines and the window start).
- Reaches the apps and services through sync PRs.

## Checks

- `node --test` on the three deploy-notify/report test files: pass.
- `npm run check` (Git Bash, Windows): pass.
