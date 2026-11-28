# 1212 Sign-out icon button

- `templates/ui/frontend/src/sign-in.tsx`: `AccountActions` shows a `LogOutIcon` in a ghost `size="icon"` button (44px press area on touch, from the button's own sizes) instead of the text "Sign out". The link keeps `signOutUrl(...)`; its accessible name and tooltip are `Sign out` (`aria-label`, `title`). The account name beside it stays.
- Test: `scripts/test/sign-out-icon.test.mjs` checks the template source. The apps own their `sign-in.test.tsx` and none of them asserts the old text; rendering was checked once in a clean workout-memo clone with a temporary test that finds the link by role and name and finds no visible text.
- No design-system change: its `docs/layout.md` does not describe the sign-out text.
