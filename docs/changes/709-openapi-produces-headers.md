# OpenAPI builder: request headers and non-JSON success bodies (#709)

- `Operation` in `templates/app/backend/src/standard/openapi.ts` gains two optional fields:
  - `headers`: request headers a route reads, by name (`description`, optional Zod `schema`, optional `required`), documented as `in: header` parameters.
  - `produces`: the content type of a success body that is not JSON (for example `text/csv`), documented as a string schema.
- Why: workout-memo documents an `Idempotency-Key` header and two CSV exports; without these fields it could not move to the managed builder without losing them.
- Existing apps are unaffected: both fields are optional and nothing changes for an operation that does not use them.
- Tests: `scripts/test/backend-openapi.test.mjs` (new case).
