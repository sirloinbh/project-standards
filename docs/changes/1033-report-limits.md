# #1033 Non-numeric report limits fall back to the defaults

- Issue: [#1033](https://github.com/sirloinbh/project-standards/issues/1033)
- Branch: `fix/1033-report-limits`
- Date: 2026-11-23 (Asia/Seoul)

## Problem

`report.sh` digit-checked only `REPORT_ERROR_LIMIT`. With `REPORT_MEMORY_PERCENT=90%`, `[ ... -gt "90%" ]` errors and counts as false, so the memory or disk fail signal never fired and nothing said so.

## Change

- `templates/deploy/deploy/report.sh.tmpl`: `REPORT_MEMORY_PERCENT` and `REPORT_DISK_PERCENT` fall back to 85 and 90 when empty or not digits.
- `scripts/test/deploy-report.test.mjs`: `90%` and `high` fall back to the defaults; a number still wins.
- Reaches apps and services through sync PRs.

## Checks

- `node --test scripts/test/deploy-report.test.mjs`: pass.
- `npm run check` (Git Bash, Windows): pass.
