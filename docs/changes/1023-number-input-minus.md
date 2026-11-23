# #1023 Make the NumberValueInput minus button explain itself without a min

- Issue: [#1023](https://github.com/sirloinbh/project-standards/issues/1023)
- Branch: `fix/1023-number-input-minus`
- Related: #105, #972

## Changes — 2026-11-23

`NumberValueInput` takes only non-negative text (digits and one point), so a − press that would give a negative number was dropped silently when no `min` was set. It now passes `Math.max(0, min ?? 0)` to `NumberInput`: the lowest value is 0, and the − button shows `aria-disabled` there like it does at any `min`. Fields that already pass `min={0}` behave as before. `NumberInput` (string value) is unchanged and still allows negatives.

## Verification

- New test in `number-input.test.tsx`: with no `min`, − at 0 keeps 0 and the button is `aria-disabled`. It fails without the change.
- In a clean workout-memo clone: the whole frontend suite passes (524 passed, 7 skipped), `npm run lint` and the frontend `typecheck` pass.
- `npm run check`: passes.
