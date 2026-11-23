# #1035 Add adoption rules for apiRateLimit and setInt8Parser

## Change

- `scripts/standards-check.mjs`: two more `ADOPTION_RULES` entries (#906). Both are warnings, not failures.
  - `api-rate-limit`: applies where the managed `standard/rate-limit.ts` and `backend/src/app.ts` exist. Warns when `app.ts` never calls `apiRateLimit(`, or calls it after `express.json(` (the limit must refuse a request before its body is read, #678).
  - `int8-parser`: applies where the managed `standard/db.ts` and `backend/src/app.ts` exist. Warns when no backend file outside `standard/` calls `setInt8Parser(` (ADR-0025, #778). Any file counts, because life-journal calls it in `pool.ts`.
- `scripts/test/standards-check.test.mjs`: a passing and a failing case for each rule, the rule list test, and the `runCheck` warning count (9 API warnings plus these 2 for the test's bare `app.ts`).

## Reason

The first three rules cover `listenHost`, `createPool` and `registerToolRoutes`; these two managed helpers had no rule, so an app could skip them with a green CI.

## Verification

- `node --test scripts/test/standards-check.test.mjs`: 35 pass.
- The new rules run against current mains of all 8 apps (shallow clones): 7 are clean; workout-memo warns that `setInt8Parser` is not called (`backend/src/app.ts` only sets the DATE parser). No app fails: these are warnings, and `runCheck` does not turn warnings into problems.
- `scripts/test/sync-pr.test.mjs`: the adoption notes of a sync PR now also name `apiRateLimit` and `setInt8Parser` (they are generated from the same rule list).
- `npm run check`: see the PR.
