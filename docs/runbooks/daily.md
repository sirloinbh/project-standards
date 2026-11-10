# Daily work log

Accumulate a summary for each workday as `docs/daily/YYYY-MM-DD.md`. Dates are in Asia/Seoul time. This file is used as `docs/daily/README.md`.

## Writing and retention rules

- At the end of a workday, or when the user asks for a summary, write or update that day's record.
- Add further work from the same day to the existing file, and do not create a file for a day with no work.
- Record only verification results that were actually run. Do not record work that was not run as done.
- Record PR creation, CI passing, merge, and deployment as separate states.
- Do not overwrite the state of a past date with today's state. When fixing a factual error, leave the reason for the correction.
- Add the new record at the top of the list below. Manage upcoming work in [Next steps](../next-steps/README.md).
- Keep detailed per-issue records separately in `docs/changes/`.

## Summaries by date

<!-- Add a new date at the top: - [YYYY-MM-DD](YYYY-MM-DD.md) -->

---

## Date file format (`docs/daily/YYYY-MM-DD.md`)

```markdown
# YYYY-MM-DD work summary

Asia/Seoul time. This is the state at the time this record was written; check GitHub again for whether things were merged.

## Done

| Issue | PR | Description | Verification | Status |
|---|---|---|---|---|
| #number | #number | One-line summary | Commands run and results | PR created / CI passed / merged / deployed |

## Problems found

- Newly filed issues and why. If something was not fixed, say it was not fixed.

## Remaining work and boundaries

- Items waiting on a user decision or approval
- Things deliberately not done this time (deployment, sync, work that costs money, and so on)
```
