# #698 Skip workout-memo's health.test.ts together with health.ts

## Change

- `registry/projects.json`: workout-memo's `allowedDifferences` now also lists `frontend/src/health.test.ts`.

## Why

workout-memo skips the managed `frontend/src/health.ts` (#310) but still received its test, `health.test.ts`, which imports `./health`. The sync PR (workout-memo#388) failed on `Cannot find module './health'`. A test must be skipped together with the file it tests.

## Checks

- `UPDATE_SNAPSHOT=1 npm test` (snapshot of the files workout-memo receives), `npm run check`: see the PR.
