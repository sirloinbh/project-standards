# The managed OpenAPI builder fails on a table it cannot document (#868)

`buildOpenApi` (templates/app/backend/src/standard/openapi.ts) now throws an error that names the route when an operation:

- has an empty `status` (it used to crash with an unrelated TypeError),
- has a `query` that is not a Zod object, such as a union or intersection (it used to give no query parameters, silently),
- lists a `params` name that is not a parameter of the path (it used to be ignored),
- has a path that repeats a parameter name, or a `headers` name listed twice (header names ignore case),
- or is keyed by something other than `METHOD /path`.

A valid table gives the same document as before: all 8 apps (study-log, money-ledger, health-log, workout-memo, life-journal, cert-manager, plan-routine, dev-career-portfolio) regenerate an unchanged `docs/openapi.json` with the new file, and eslint, tsc and prettier pass there.

Tests: `scripts/test/backend-openapi.test.mjs` (new case with each bad table and one valid table).
