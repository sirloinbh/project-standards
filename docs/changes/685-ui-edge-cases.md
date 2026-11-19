# #685 Fix combobox, button, and confirm dialog edge cases

## Change

| File | Content |
|---|---|
| `components/ui/combobox.tsx` | The highlighted option is clamped to the current list (`activeIndex`), so Enter never picks an option that vanished when the list shrank; `pick` ignores `undefined` |
| `components/ui/button.tsx` | `type` defaults to `button` (not for `asChild`), so a button inside a form no longer submits it by accident. Styling for `aria-disabled` added |
| `components/ui/confirm-dialog.tsx` | A rejected `onConfirm` is logged with `console.error`; the buttons use `aria-disabled` while pending so keyboard focus stays; a second confirm click while pending is ignored |
| `combobox.test.tsx`, `button.test.tsx`, `confirm-dialog.test.tsx` | A test for each case (the old test that locked in native `disabled` now checks `aria-disabled`) |

## Before the apps take the sync

`Button` now defaults to `type="button"`. In each app, check that every submit button sets `type="submit"` (search for `<Button` inside `<form>` and for forms submitted with Enter on a `Button`). The central templates and scaffold have no `Button` inside a form. The agent checks this when reviewing each sync PR.

## Verification

- The whole UI kit Vitest suite (17 files, 55 tests) passes in a scratch copy (Vitest 5.0.3, jsdom) using an app repo's installed packages; the central check does not run Vitest.
