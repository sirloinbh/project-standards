# #674 Return per-field validation errors from the API

## Change

- `templates/app/backend/src/standard/http.ts`: a Zod 400 answer now also carries `fields: [{ path, message }]` (path joined with `.`, empty for the whole body, at most `MAX_ISSUES` entries). `error` is unchanged. `ApiError` gets an optional `fields`; `sendError` takes it as an optional fourth argument. Other errors keep the one-key body.
- `templates/ui/frontend/src/lib/api.ts` (lane-3's file, approved by the coordinator): `RequestError.fields` lists the fields of a 400 answer, keeping only well-formed entries; it is empty otherwise. The constructor's new fourth argument is optional, so existing callers are unaffected.
- Tests: `scripts/test/backend-http.test.mjs` (shape, empty path, cap) and `templates/ui/frontend/src/lib/api.test.ts`. `docs/directory-rules.md` documents the shape.

## Reason

dev-career-portfolio parses the joined sentence in `frontend/src/field-errors.ts` with six label tables; its app issue to place errors by path waits on this.

## Verification

- `node --test scripts/test/backend-http.test.mjs`: 15 pass. `api.test.ts` in a rendered scaffold: the new test passes (the existing `aborting the caller's signal` test timed out in that borrowed environment and is not touched by this change).
- `npm run check`: see the PR.
