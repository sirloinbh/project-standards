# #999 Describe the validation fields list in the shared OpenAPI Error schema

- Issue: [#999](https://github.com/sirloinbh/project-standards/issues/999)
- Branch: `feat/999-openapi-error-fields`
- Related: sirloinbh/dev-career-portfolio#200 (the hand patch this replaces), #674 and #799 (`createErrorHandler({ fields: true })`)

## Changes — 2026-11-22

`buildOpenApi` in `templates/app/backend/src/standard/openapi.ts` takes a new option, `errorFields`. When it is `true`, the shared `Error` schema also lists the optional `fields` array that `createErrorHandler({ fields: true })` adds to a validation 400: items `{ path, message }`, both required strings. `error` stays the only required property. Without the option the schema is unchanged, so no app's document changes until it opts in.

dev-career-portfolio patches `document.components.schemas.Error` by hand after `buildOpenApi` (#200); once this syncs, it can pass `errorFields: true` and drop the patch.

## Verification

- `node --test scripts/test/backend-openapi.test.mjs`: 9 passed, including the new test (without the option the Error schema has only `error`; with it, `fields` is an array of `{ path, message }` and `required` stays `['error']`).
- `npm test`: 591 passed; the same 5 Mac-only failures as on a clean `origin/main` (2 backup tests, 2 vendored-copy tests, 1 scaffold standards-check test). CI on Linux is the check of record.
- `registry:check`, `docs:check`, `tokens:check`, `self:check`, `packages:check`, `workflows:check`, `secrets:check`: pass.
