# #689 Move generic workout-memo components into the UI kit

## Change

The generic components that only workout-memo had are now managed files under `templates/ui/frontend/src/components/ui/`, each with its tests, so every UI app gets them.

| Component | Notes on the move |
|---|---|
| `switch.tsx` | As in workout-memo |
| `segmented-control.tsx` | As in workout-memo |
| `number-input.tsx`, `number-step.ts` | As in workout-memo (`NumberInput`, `NumberValueInput`, `stepValue`) |
| `date-stepper.tsx` | `DateStepper`, `RangeSummary` |
| `stat-card.tsx` | As in workout-memo |
| `alert-banner.tsx` | Dropped the app-specific `mb-5`; screens add their own margin |
| `page-header.tsx` | Merged the three page headers the apps have (workout-memo's, dev-career-portfolio's with `headingRef`, cert-manager's with `actions`): optional eyebrow, description and actions, `headingRef`, `id` (default `page-title`). Dropped workout-memo's custom 9px eyebrow type, the closing dot on the title and the bottom margin |
| `field.tsx`, `field-props.ts` | `FieldError`, `fieldErrorId`, `invalidProps`. The message's legacy `field-error` CSS class became Tailwind classes; the bare `Input` wrapper in workout-memo's `field.tsx` was not moved (use the UI kit `Input`) |

Tests were copied and adapted: they import from `./label`, `./button` etc., and use `fireEvent` instead of `user-event` (not every app has it). `docs/ui-components.md` lists the new files; `scripts/test/fixtures/sync-snapshot.json` lists them as synced.

## What was left in workout-memo on purpose

`modal`, `list`, `toggle-chips`, `keyboard-inset` and `form-styles`: `modal` duplicates `Dialog`, `list` is 12 lines, `form-styles` is replaced by `Textarea` and `NativeSelect` (#688), and the other two have no second app asking for them. The issue's list did not include them either.

## Follow-up

Workout-memo switches its imports to the synced versions and deletes its copies (and the other apps adopt the page header and field helpers when they next touch those screens). Opened as an issue in sirloinbh/workout-memo.

## Verification

- The whole UI kit Vitest suite (27 files, 94 tests) passes in a scratch copy (Vitest 5.0.3, jsdom) using an app repo's installed packages; the central check does not run Vitest.
