# Fix the import order in the managed number-input.tsx

When #689 moved `NumberInput` into the UI kit I changed its relative imports (`./ui/button` became `./button`), which put `./button` and `./input` after `./number-step`. The apps lint with `simple-import-sort`, so the managed file failed lint in every app sync PR (2:1, "Run autofix to sort these imports").

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/number-input.tsx` | Imports sorted (`./button`, `./input`, `./number-step`). Produced by running the apps' ESLint with `--fix` |
| `scripts/test/import-order.test.mjs` | New test over every TypeScript file in `templates/` and `scaffold/`: `node:` imports first, then packages, then relative imports (`../` before `./`), each group alphabetical. It reads the sources because this repo does not install ESLint. Checked against the file that failed: it names `./button should come before ./number-step` |

## Checked with the real rule

All managed UI, msw, vitest and app files (including the ones in the #680 branch) were linted with an app's ESLint config (the managed `eslint.config.mjs`, without the type-aware part) in a scratch copy: `number-input.tsx` was the only error. The new test is a guard for the same class of mistake, not a copy of the rule; for the exact rule run ESLint in an app.
