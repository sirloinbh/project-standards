# #706 Split the slowest test file

Second part of #706 (the first part, `check:docs` and the per-file times, is in [706-faster-check.md](706-faster-check.md)).

## Change

`scripts/test/deploy-templates.test.mjs` (662 lines, 29 tests) was one file, so the parallel runner could not spread it. It is now 7 test files plus 3 helper modules. No test was changed or dropped: the 29 test names are identical before and after.

| File | Content |
|---|---|
| `deploy-templates.test.mjs` | Rendering, shell syntax, autodeploy, remote-deploy network |
| `deploy-backup.test.mjs`, `deploy-backup-verify.test.mjs` | backup dump and S3 upload; restore check, timers, notify signals |
| `deploy-ssm.test.mjs` | `ssm-get.sh` and the `@ssm=` key export |
| `deploy-notify.test.mjs` | `notify.sh` signals and health pings |
| `deploy-report.test.mjs`, `deploy-report-errors.test.mjs` | the daily report; error lines in the report and the ones saved before a deploy |
| `deploy-helpers.mjs`, `deploy-backup-helpers.mjs`, `deploy-report-helpers.mjs` | Shared setup and the `backupRun` / `reportRun` fakes. Not `*.test.mjs`, so the runner does not run them |

## Result (same machine, same load, 2026-11-19)

| | Wall time |
|---|---|
| Original single file | 97 s |
| The 7 files in parallel | 45 s |

Slowest single file now about 21 s (it was 68 s serial earlier in the day, 97 s under load). The floor is the largest single test (about 22 s: the report error-line test, which starts `bash` many times).

## Checks

- `node --test scripts/test/deploy-*.test.mjs`: 28 pass, 1 skipped (as before), 0 fail.
- `npm run check` result is in the PR.
