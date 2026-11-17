# #644 Count an error line only once when a deploy saves it

## Change

| File | Content |
|---|---|
| `templates/app/deploy/report.sh.tmpl` | After a successful send, writes the start time of this report (UTC, `YYYY-MM-DDTHH:MM:SSZ`) to `.report-last-sent`. The live count uses `docker compose logs --since <that time> --until <this report's start>`, or `24h` when the file is missing or malformed. `line` reads the same window but never writes the file. The saved file is emptied and the time recorded only when `notify.sh` succeeds, so a failed send keeps the whole window for the next report |
| `templates/app/deploy/remote-deploy.sh.tmpl` | `save_api_errors` uses the same `.report-last-sent` time as `--since` (else `24h`) |
| `scripts/test/deploy-templates.test.mjs`, snapshot | Cases: the first run without the file uses `24h` and records a time, the next run starts at the recorded time and moves it forward, a bad file falls back to `24h`, `line` does not record a send, and `save_api_errors` uses the file time or `24h` |

## Why

With a fixed 24-hour window, a container that ran across a report had its earlier errors counted by that report, then saved again by the next deploy and counted a second time. Both the saved lines and the live count now start where the previous report started, so each error line falls in exactly one report. The start time is taken before the logs are read and the live read stops there (`--until`), so each line falls in exactly one window: a line written while the report runs belongs to the next one.

## Verification

- `node --test scripts/test/deploy-templates.test.mjs`: 28 tests, 27 pass, 1 skipped, 0 fail
- `npm run check`: passed (652 tests, 650 pass, 2 skipped, 0 fail; all other checks ok)
