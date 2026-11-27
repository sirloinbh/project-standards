# #1151 Keep the DateField input at 16px on touch screens

## Why

`DateField` and `TimeField` (#1138) lost the touch font size the old `DateStepper` had. From 768px up the shared field class switches to `md:text-body-sm` (14px), so on a tablet the input is below the 16px that stops iOS from zooming the page on focus. workout-memo worked around it in its own `style.css` (sirloinbh/workout-memo#518).

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/date-field.tsx` | The text input gets `md:pointer-coarse:text-base`, as `DateStepper` had. Below md the field is already `text-base`, so it is 16px on touch at every width. Mouse and trackpad users keep 14px. |
| `templates/ui/frontend/src/components/ui/date-field.test.tsx` | A test checks both classes on the input. |

## After the sync

Apps can remove local overrides of the date input size (workout-memo: the `date-field` rule in `frontend/src/style.css`).

## Checks

`npm run check`.
