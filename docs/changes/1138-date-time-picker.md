# #1138 Add an English date and time picker to the UI kit

## Why

The browser's native date and time inputs write their parts and calendar popup in the browser's language ("연도 / 월 / 일" in a Korean browser), and `<html lang="en">` does not change them. The user wants no Korean on screen (sirloinbh/study-log#421, #447). The kit had no picker, and every app uses native inputs (study-log 19, workout-memo 14, money-ledger 12, health-log 11, dev-career-portfolio 10, life-journal 6, cert-manager 5, plan-routine 4).

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/date-field.tsx` | `DateField` (`YYYY-MM-DD`) and `TimeField` (`HH:MM`): a text field plus a `radix-ui` Popover. The date popover is a month grid (`role="grid"`, Sunday-first or `weekStartsOn={1}`, arrow keys, Home/End, PageUp/PageDown with Shift for a year, `min`/`max`, Today, Clear unless `required`, 40px cells and 48px on touch). The time popover lists hours and 5-minute steps (any minute can be typed). |
| `templates/ui/frontend/src/components/ui/date-fields.ts` | Pure helpers on `YYYY-MM-DD` strings in UTC, English month and weekday names (not Intl, which follows the browser language), `seoulToday`. |
| `templates/ui/frontend/src/components/ui/date-stepper.tsx` | Uses `DateField`. Only a whole valid date moves the anchor; a half-typed or cleared field keeps the current date and shows it again on blur. |
| `templates/ui/frontend/src/components/ui/date-field.test.tsx`, `date-stepper.test.tsx` | Typing, pasting, clearing, picking, month and arrow-key moves, limits, Today and Clear, Escape, disabled, time picking, helper functions. |
| `docs/ui-components.md` | A row for the new files; the "date or time" line of the pick-instead-of-type table. |
| `scripts/test/fixtures/sync-snapshot.json` | The new files are in the list apps receive. |

## What was decided

- **Text field plus popover, not a calendar-only button.** Keyboard entry and paste stay, which e2e tests and desktop users rely on. The value is a plain string like `NumberInput`'s, so apps keep their own validation.
- **No new package.** The month grid is about 150 lines; Popover is in `radix-ui`, which every app has.
- **No wrapping `<label>`.** A label around the field would add the calendar button's name to the field's name; apps use `label` or `htmlFor`.

## Checks

- In a study-log clone (kit files copied in, restored afterwards): `npm test -w frontend -- components/ui/date`: 13 tests passed (before: 4 in `date-stepper`).
- Browser check (Playwright with `@axe-core/playwright`, Vite, Chromium with locale ko-KR) at 390x844 touch and 1440x900: no axe violation with the calendar or the time popover open; no Korean text; no sideways overflow; calendar cells 48px on touch, 40px on desktop.
