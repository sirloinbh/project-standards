# #679 One managed OpenAPI builder

## Change

- `templates/app/backend/src/standard/openapi.ts` (managed, new): `buildOpenApi({ title, description, operations, statusText?, errorDescription? })` builds the OpenAPI 3.1 document and `schemaOf(schema)` converts a Zod schema with `z.toJSONSchema()` (JSON Schema 2020-12, input side; a type it cannot express throws). It adds the shared sign-in `securitySchemes` (cookie `sirloinbh.session_token`), the top-level `security`, and default `401` and `429` answers on guarded routes plus `413` on routes with a body. A route marked `public: true` (only `/api/health`) has `security: []` and no default 401 or 429.
- `templates/app/backend/src/standard/openapi-cli.ts` (managed, new): writes `docs/openapi.json` from the app's `document` export.
- `scaffold/app/backend/src/openapi.ts` shrinks to the operation table and the `buildOpenApi` call (it walked Zod and Express internals before); `openapi-cli.ts` is a one-line entry so `npm run openapi` keeps working. `scaffold/app/docs/openapi.json.tmpl` is regenerated.
- The route check moved to the scaffold test: it compares the operation table with `app.router.stack` in the test only, so the builder does not depend on Express or its private API.
- `scripts/test/backend-openapi.test.mjs` tests the assembly with a stub for `zod/v4` (Zod is not installed in this repository); the scaffold's `backend/test/openapi.test.ts` runs the real conversion in the `scaffold-tests` CI job.
- `docs/research/zod4.md`, `docs/directory-rules.md`: follow the change.

## Reason

Each app kept its own `backend/src/openapi.ts` (8 copies, 3,359 lines) that walked `_zod.def` and `app.router.stack`, skipped refinements, and listed 401/429/413 only partly.

## Differences in the generated document

- Added: `securitySchemes`, `security`, 401 and 429 on `/api/me`, `security: []` on `/api/health`. `z.int()` fields now carry the safe integer bounds that `z.toJSONSchema()` emits. Apps that adopt the builder regenerate their `docs/openapi.json`.
- Descriptions of the default statuses are English; an app passes `statusText` to keep its own wording (the scaffold keeps Korean).

## Follow-up

- Each app replaces its `backend/src/openapi.ts` with an operation table in its own PR (not part of this change).

## Verification

- `node --test scripts/test/backend-openapi.test.mjs`: 5 pass. The scaffold rendered into a temp folder with an app's installed packages: `openapi.test.ts` 7 pass, `tsc -p tsconfig.check.json` clean.
- `npm run check`: see the PR.
