# #1129 Korean screen text fails the standards check

User requirement (2026-11-26): no Korean on any app screen. All eight app cards are closed (workout-memo#505, study-log#421, health-log#351, life-journal#236, money-ledger#360, cert-manager#218, plan-routine#329, dev-career-portfolio#246).

## Change

| File | Change |
|---|---|
| `scripts/standards-check.mjs` | `koreanScreenTextFindings` and `checkKoreanScreenText`: Hangul outside comments in `frontend/src` sources is a problem (group `screen text`), not a warning. Tests, fixtures and e2e files are skipped. `korean-ok` and `korean-ok-file` markers allow code that recognizes Korean input |
| `scripts/test/standards-check.test.mjs` | Tests for comments, tests, markers, and a failing repo |
| `docs/korean-text-check.md` | The rule, what is scanned, and the marker |

## Apps that will report findings after the next sync

A scan of each app's main on 2026-11-27 found Korean outside comments in four apps. Most of it is code that parses Korean input and only needs a `korean-ok` marker; a few lines may be real screen text (for example the `'주거'`/`'여가'` categories in money-ledger `fixed-costs.tsx`, `'미분류'` in workout-memo `analysis.tsx`, and the help text in study-log `contents-paste-form.tsx`). Each app fixes its own sync PR.

| App | Lines | Files |
|---|---|---|
| workout-memo | 35 | `inbody.ts`, `analysis.tsx` |
| health-log | 25 | `nutrition-label.ts` |
| money-ledger | 16 | `entry-csv-parse.ts`, `fixed-costs.tsx` |
| study-log | 5 | `toc.ts`, `contents-paste-form.tsx` |
| cert-manager, plan-routine, life-journal, dev-career-portfolio | 0 | |

## Scaffold fix found by the new check

`scaffold/app/frontend/src/app.tsx` (and its unit and e2e tests) used the Korean word for "Overview" as the first menu item and heading. New apps would have started with Korean screen text, so it is now `Overview`. The scaffold test's made-up project uses English values.
