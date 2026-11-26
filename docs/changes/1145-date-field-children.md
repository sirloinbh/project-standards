# #1145 Let the date field popover take a function as children

`TimeField` passes a render function to `PickerField` as `children`, but `FieldProps` still carried the input's `children: ReactNode`, so `tsc` failed with TS2322 in any app that receives `date-field.tsx` (found on the workout-memo sync PR, wave 1).

| File | Change |
|---|---|
| `templates/ui/frontend/src/components/ui/date-field.tsx` | `'children'` is omitted from `FieldProps` |

Checked: `npm run typecheck` in a workout-memo clone with the change passes; `npm run check` here.
