# #285 Daily server status report

## Change

| File | Content |
|---|---|
| `templates/app/deploy/report.sh.tmpl` | One line: `memory=..% disk=..% deployed=<commit> [autodeploy-failed=<commit>] containers: <name> <memory>, ...`. Sent as the body of the healthchecks.io report signal, and a failure signal is sent when memory (`REPORT_MEMORY_PERCENT`, default 85) or disk (`REPORT_DISK_PERCENT`, default 90) exceeds the threshold. `line` only prints |
| `templates/app/deploy/report.{service,timer}.tmpl` | Every day at 04:00 (Seoul) |
| `templates/app/deploy/install-backup.sh.tmpl` | Also installs the report timer |
| `scripts/test/deploy-templates.test.mjs`, snapshot | With fake free, df, and docker, checks the one-line format, failure over the threshold, and thresholds from `.env` |
| `docs/runbooks/deploy.md` | Report format and thresholds |

Memory usage is (total − available) / total from `free`. We keep, every day, the value that ADR-0009 decided to measure on the 2 GB server.

## Verification

- `node --test scripts/test/deploy-templates.test.mjs`: 21 of 22 passed, 1 skipped (no python3, an existing test)
- `npm run check`: 462 of 463 tests passed, 1 skipped, 0 failed
