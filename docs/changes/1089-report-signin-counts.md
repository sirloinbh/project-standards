# #1089 Sign-in counts in the daily report

Issue: https://github.com/sirloinbh/project-standards/issues/1089 (for shared-auth#45)

## Change

| File | Content |
|---|---|
| `templates/deploy/deploy/report.sh.tmpl` | `api_lines` reads the saved pre-deploy file and the live api logs once into a temporary file. The error lines are taken from it as before; the `"event":"sign_in"` lines give ` signins=<N> refused=<M>` (`"outcome":"success"` and `"outcome":"refused_..."`), added after `errors=` only when there is at least one sign-in line |
| `templates/deploy/deploy/remote-deploy.sh.tmpl` | `save_api_errors` also keeps `"event":"sign_in"` lines in `.errors-before-deploy.log`, so a deploy does not drop the day's sign-ins. They are `info` or `warn`, so the error count is unchanged |
| `scripts/test/deploy-report-errors.test.mjs` | No sign-in lines (line unchanged), successes and both refusal kinds counted, saved lines counted and not as errors, no IP or user agent in the ping body, a refusal does not fail the day; the pre-deploy save keeps sign-in lines |
| `docs/logging.md` | The sign-in count under "Daily error alert" |

## Why

shared-auth writes one JSON line per sign-in outcome (shared-auth#33), and shared-auth#45 asks for the counts in its daily report. `report.sh` and `remote-deploy.sh` are managed files, so the change is made here. User decision (2026-11-23): do it centrally and print the counts only when sign-in lines exist, so the apps' report lines stay unchanged.

## Verification

- `node --test scripts/test/deploy-report-errors.test.mjs`: 3 passed.
- `npm run check`: see the PR.

## Limits

- A day without any sign-in shows no sign-in field rather than `signins=0 refused=0`.
