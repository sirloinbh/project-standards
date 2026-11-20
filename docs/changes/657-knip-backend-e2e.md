# #657 Make the app knip.json read backend tests and e2e dependencies

## Change

- `templates/app/knip.json`:
  - `workspaces.backend.entry: ["test/**/*.test.ts"]`: the backend `node:test` files (run with `tsx --test`) are entry files, so exports used only by them are not reported as unused.
  - `ignoreIssues: { "e2e/**": ["unlisted"] }`: the root `e2e/` specs may import packages that a workspace (for example `frontend`) declares, such as `@garmin/fitsdk` and `fflate`.
  - `frontend/public/**` is no longer in `ignore`: knip only hinted that it was not needed (workout-memo, money-ledger) and health-log reports nothing without it.

## Left as it is (justified)

- `@lhci/cli` and `zod` stay in `ignoreDependencies`, and the `contract.ts` paths stay in `ignore`. The template is shared by all apps; an app that does not use one of them gets a knip configuration hint (a warning that does not fail strict mode), but an app that does use it (health-log: `@lhci/cli` and `zod` are reported as unused without them) would get a finding.
- workout-memo's three exports `bodyParts`, `deloadWeight` and `progressionStep` are used only by a test that loads `src/progress.ts` through `typescript` and `node:vm` (`routine-progression.test.ts`), which knip cannot follow. That is app code; marking them `@public` is an app follow-up (see the PR).

## Checks

- Tried the new file in workout-memo and health-log: the `e2e/cardio-import.spec.ts` findings and the `frontend/public/**` hint are gone, and health-log stays clean. `npm run check`: see the PR.
