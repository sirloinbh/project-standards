# #972 Let the UI kit number input hold an empty value

The kit's `NumberValueInput` stored an emptied field as `0`, and the kit had no shared reader for typed number text. workout-memo needs an emptied weight or reps field to stay empty (`undefined`), so saving shows the field's error instead of saving 0 (sirloinbh/workout-memo#383). That is why it kept local copies of `components/number-input.tsx` and `components/number-step.ts` when it moved to the kit (sirloinbh/workout-memo#393, PR sirloinbh/workout-memo#459).

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/number-input.tsx` | `NumberValueInput` takes `allowEmpty`. With it, `value` and `onValueChange` are `number \| undefined`: an emptied field emits `undefined`, and `undefined` shows an empty field. Without it nothing changes (an emptied field reads as `0`). The props are a union, so a caller without `allowEmpty` cannot pass `undefined` and a caller with it must accept `undefined` |
| `templates/ui/frontend/src/components/ui/number-step.ts` | New `optionalNumber(text)`: empty → `null`, a plain decimal (optionally negative) → the number, anything else (`0x10`, `1e3`, `Infinity`, `1,000`) → `NaN`. `stepValue` reads the field with it, so − and + treat hex or thousands-separated text as unreadable (start from the minimum) instead of as 16 or 1 |
| `templates/ui/frontend/src/components/ui/number-input.test.tsx` | Tests for `optionalNumber`, `stepValue` on unreadable text, and `allowEmpty`: an emptied field, an empty start that steps from the minimum, a partly typed "1.", a typed value above `max` (kept for the form to report, + disabled, − brings it to `max`), and two `@ts-expect-error` lines for the prop types |
| `docs/ui-components.md` | The number input row names `allowEmpty` and `optionalNumber` |

## What was decided

- **workout-memo's tested code, not the issue's sketch.** The issue suggested `optionalNumber` return `undefined` for empty and "otherwise a finite number". The kit takes workout-memo's existing reader as it is (`null` for empty, `NaN` for unreadable text), with its tests. Its cardio form and tests depend on exactly that, and `NaN` is what makes the schema report "Enter ... as a number" on the field. So workout-memo can delete its copies without changing behaviour.
- **`allowEmpty` instead of always `number | undefined`.** The issue asks to keep the current behaviour as the default. A caller holding a plain `number` keeps its types and its `0` for an emptied field. workout-memo adds `allowEmpty` to its two `NumberValueInput` uses when it switches to the kit.
- `optionalNumber` lives in `number-step.ts` next to `stepValue`, as in workout-memo (its `cardio/format.ts` re-exports it from there). Kit files are ignored by knip, so apps that do not use it get no warning.

## Checks

In a study-log clone (the three kit files copied in, restored afterwards):

- `npm run test -w frontend -- src/components/ui/number-input.test.tsx`: 20 passed.
- `npm run test -w frontend`: 51 files, 332 passed, 3 skipped.
- `npm run typecheck -w frontend`: no errors. Removing one `@ts-expect-error` line makes it fail with TS2322, so the prop-type tests are checked.
- `eslint` on the three files: no errors. Prettier `--check`: formatted.
- `npm run check` in this repo: see the PR.

## Follow-up in workout-memo

After the sync PR is merged: import `NumberValueInput` from `components/ui/number-input` with `allowEmpty` on the weight and reps fields, re-export `optionalNumber` from `components/ui/number-step` in `cardio/format.ts`, import `NumberInput` in `cardio/cardio-form.tsx` from the kit, and delete the local `number-input.tsx`, `number-step.ts` and `number-input.test.tsx`.
