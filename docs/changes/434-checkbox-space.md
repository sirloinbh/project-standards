# #434 Restore the missing space between the shared Checkbox touch target classes

In #415 (PR #431), when `-inset-3.5` was changed to `-inset-[15px]`, the space before the next class was lost. So `pointer-coarse:after:-inset-[15px]pointer-coarse:after:content-['']` became one invalid class in Tailwind, and the 44px touch target was not applied.

## How it was found

In the sync PRs for 8 apps (project-standards@6b5d099), `verify` failed in all of them on `touch screens get a 44px tap area around the 16px box` in `checkbox.test.tsx`. This test runs only in the app repo's Vitest, so central CI did not catch it.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/checkbox.tsx` | Put a space between the two classes |

## Checks

- After the app sync PRs are updated with this commit, check that `verify` passes.
