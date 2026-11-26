# #1125 Make buttons, inputs and selects one size larger

User requirement (2026-11-26): controls are hard to hit, especially on a phone.

## Change

| Component | Before | After |
|---|---|---|
| Button `default` | `h-9`, touch `min-h-11` | `h-10`, touch `min-h-12` |
| Button `sm` | `h-8`, touch `min-h-11` | `h-9`, touch `min-h-12` |
| Button `lg` | `h-11` | `h-12` |
| Button `icon` | `size-9`, touch `size-11` | `size-10`, touch `size-12` |
| Input, NativeSelect | `h-9`, touch `min-h-11` | `h-10`, touch `min-h-12` |
| Select trigger | `h-9` / `h-8` (sm), touch `min-h-11` | `h-10` / `h-9` (sm), touch `min-h-12` |

Textarea already has a taller minimum (`min-h-20`) and is unchanged. SegmentedControl, close buttons, Checkbox and Switch keep their 44px touch area (the card names only buttons, inputs and selects).

## Files

`button.tsx`, `input.tsx`, `native-select.tsx`, `select.tsx` and their tests under `templates/ui/frontend/src/components/ui/`; "Touch targets" in `docs/ui-components.md`.

## Checks

- `npm run check` in this repo.
- Lint, typecheck, unit tests and e2e of a clean workout-memo clone with the new files (results in the PR).
