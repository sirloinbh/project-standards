# #1142 Fix the type error in DateField and TimeField that stops the sync

## Why

PR #1139 (#1138) added `DateField` and `TimeField`. In an app, `tsc` reported `Type '(close: () => void) => Element' is not assignable to type 'ReactNode & ((close: () => void) => ReactNode)'` at the two `PickerField` uses. The field props came from `ComponentProps<typeof Input>`, which has its own `children`, and the popover body function was intersected with it. The kit tests ran in vitest and eslint, which do not type check, so it was missed. workout-memo's sync PR (#507, the first wave) went red and the sync stopped before the other apps.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/date-field.tsx` | `children` is omitted from the field props (`FieldProps`), so only the render function is left. |

## Checks

In a study-log clone (kit files copied in, restored afterwards): `npm run typecheck` (frontend and backend) passes, `eslint` is clean and `npm test -w frontend -- components/ui/date` passes 13 tests. The same `tsc` error reproduces in workout-memo's CI log for the earlier commit.
