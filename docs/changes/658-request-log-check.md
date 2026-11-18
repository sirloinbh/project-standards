# 658: request log check also checks the order

## What changed

- `scripts/standards-check.mjs` (`checkApi`): the warning for a missing `app.use(requestLog)` already existed (#552). It now also warns when `requestLog` is mounted after an `/api` or `/internal` route (`app.use('/api/...')`, `app.post(...)` and so on). The health check may come first, which keeps the study-log style passing.
- `scripts/test/standards-check.test.mjs`: a test for late (warned) and first (passes). Existing tests cover missing (warned) and the study-log variant (passes).
- `docs/logging.md`: states the mounting order rule.

## Decision

It stays a warning, like the other API rules (health, error handler, 404): `checkApi` returns warnings only and the compliance report lists them. The apps have different layouts, so these rules do not fail CI.

## Tests

`npm run check`.
