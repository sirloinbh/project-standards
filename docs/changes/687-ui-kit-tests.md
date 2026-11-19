# #687 Make UI kit tests check what their titles claim

## Change

| File | Content |
|---|---|
| `components/ui/select.test.tsx` | The keyboard test now moves with ArrowDown and picks with Enter (it clicked the option before) |
| `components/ui/dropdown-menu.test.tsx` | Same: ArrowDown moves to the item and Enter picks it |
| `components/ui/sonner.test.tsx` | A new case toggles the html `dark`/`light` class after the toaster is mounted, so the MutationObserver is exercised |
| `lib/theme.test.ts` | Blocked-storage cases: reading gives `system`, and applying a choice still sets the class without throwing |
| `msw/frontend/src/test/contract-api.ts` | An override keeps the contract's success status (201, 204, ...); 204/205 answer with no body. New exports `successStatus`, `overrideResponder` and the `Operation` type |
| `msw/.../contract-api.test.ts` | Tests for `successStatus` and `overrideResponder`, and the status of an override |

## Hand check that the tests can fail

Each changed test was run once against a deliberately broken copy and failed as it should:

- select and dropdown: Enter replaced with another key, so nothing is picked
- sonner: the MutationObserver registration removed
- theme: the `try/catch` in `readTheme` removed

## Verification

- The select, dropdown-menu, sonner and theme tests pass in a scratch copy (Vitest 5.0.3, jsdom) using an app repo's installed packages; the central check does not run Vitest.
- The new `contract-api` tests for `successStatus` and `overrideResponder` pass in the scratch copy with stand-ins for `msw`; the tests that start the mock server need `msw` and an app's `docs/openapi.json`, which no local checkout has installed, so they were not run (only the override test gained a status assertion).
