# #39 Common rule documents (domain rules, UX checklist)

## Change

| File | Content |
|---|---|
| `docs/conventions/domain.md` | Time zone (`Asia/Seoul`, `serviceDate()`), storage and API formats for dates, times, points in time, and durations, screen display, money (integer won, `bigint`), quantity units (metric, `numeric` precision, distinguishing `NULL` from 0), and server validation and Korean messages |
| `docs/conventions/ux-audit.md` | When to audit, per-page measurement items (horizontal overflow, 44px touch targets, 16px inputs, axe, keyboard, light and dark), task scenarios, methods (audit DB and seed, Playwright, real devices and Lighthouse), severity P1–P3, and the record location `docs/ux-audit/YYYY-MM-DD.md` |
| `docs/design-system.md` | One line linking the UX audit document in the responsive and accessibility section |

I did not create an index file in `docs/conventions/`. `database.md` from #27 will arrive in the same folder separately, so the README link is added once, after both documents are in.

## Sources

- workout-memo: the date, time zone, and total weight kg rules in `AGENTS.md` and `AGENTS.project.md`, the `date` schema in `shared/contract.ts`, `date`, `timestamptz`, and `numeric(7,2)` in `database/migrations/001_initial.sql`, and the method, metrics, severity, and re-measurement procedure in `docs/ux-audit/2026-10-21.md`
- study-log: `serviceDate()` in `backend/src/app.ts` (`Intl.DateTimeFormat`, `Asia/Seoul`), and the midnight-crossing handling in `studyMinutes()`
- The money rules and the first day of the week have no basis in the existing apps, so they were newly decided. money-ledger has no money code yet.

## User decisions (2026-10-22)

The user decided these in the review of PR #169.

- A week starts on **Sunday**. This changed the originally proposed Monday (ISO 8601).
- Approved: money is stored as integer won in `bigint`.
- Approved: the direction of income and expense is expressed by a kind field (`kind`) instead of a sign.
- Approved: foreign currency and fractional assets will be decided in an issue when money-ledger needs them.
- Note: the default goal end date in workout-memo is "this week's Sunday" (2026-10-21 UX audit scenario 3). In a Sunday-start week, Sunday is the first day of the week, so whether to align this behavior with the common rule is decided separately in workout-memo.

## Conflict check against the AGENTS.md of the 8 apps

On 2026-10-22, I read and compared the `AGENTS.md` and `AGENTS.project.md` of the 8 apps through the API (main branch).

| App | Date and time zone | Screen check sizes | Service rules | Conflict |
|---|---|---|---|---|
| workout-memo | `YYYY-MM-DD`, `Asia/Seoul` | No size in AGENTS (e2e responsive and axe checks) | Total weight kg, unknown default weight is NULL | None |
| study-log | `YYYY-MM-DD`, `Asia/Seoul`, `serviceDate()` | 390×844, 1440×900 | None | None |
| health-log | Same as above | Same as above | None | None |
| life-journal | Same as above | Same as above | None | None |
| money-ledger | Same as above | Same as above | None | None |
| english-study | Same as above | Same as above | None | None |
| plan-routine | Same as above | Same as above | None | None |
| dev-career-portfolio | Same as above | Same as above | None | None |

- The `AGENTS.md` of the 7 apps (excluding workout-memo) differ only in the app name, description, and ports; all other lines are the same.
- No rules conflict. There are two differences worth noting.
  - The workout-memo audit of 2026-10-21 took its PC comparison screenshots at 1280×800. This document uses 1440×900, matching the design system and the AGENTS.md of the 7 apps. The existing record is not changed.
  - workout-memo `AGENTS.md` lacks the sentence "compute today with `serviceDate()`". The rule is missing rather than different, so it is aligned at sync time.

## Checks

- Only documents changed. `npm run check` passed (165 of 166 tests passed, 0 failed, and `registry:check`, `docs:check`, `tokens:check`, `packages:check`, and `workflows:check` all ok).
- I checked that the targets of the relative links in the new documents (`../design-system.md`, `../projects.md`, `../dependency-policy.md`, the std-backlog `SKILL.md`, `conventions/ux-audit.md`) exist.
