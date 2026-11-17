# #569 knip: allow the e2e and Lighthouse tools

## Change

| File | Content |
|---|---|
| `templates/app/knip.json` | `ignoreBinaries`: `tsc` (root `typecheck` runs `tsc -p e2e/tsconfig.json`) and `tsx` (`playwright.config.ts` starts the API with `npx --no-install tsx`). `ignoreDependencies`: `@lhci/cli` (run by the CI Lighthouse step, `node_modules/.bin/lhci`, which knip cannot see) |

## Why

The app PRs for #568 and #569 (for example health-log#174) failed the strict knip step: `@lhci/cli` unused, `tsc` and `tsx` unlisted binaries. workout-memo only warns (not `knipStrict`), so it never showed.

## Verification

- `npm run check`: recorded in the PR body
