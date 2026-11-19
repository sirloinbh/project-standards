# #799 Per-field validation errors are opt-in per app

## Change

- `templates/app/backend/src/standard/http.ts`: `createErrorHandler({ fields })` builds the error handler. With `{ fields: true }` a validation 400 lists the invalid fields by path (#674); `errorHandler` (the handler without `fields`) stays as it was, so an app's `app.use(errorHandler)` keeps the `{ error }` body.
- `scaffold/app/backend/src/app.ts` registers `createErrorHandler({ fields: true })`, so new apps get `fields`; `routes/shared.ts` re-exports `createErrorHandler`.
- `scripts/test/backend-http.test.mjs` tests both modes and that the handler keeps four parameters (Express needs that to treat it as an error handler); `scripts/test/scaffold.test.mjs` follows. `docs/directory-rules.md` says when `fields` appear.

## Reason

The always-on `fields` from #674 broke the apps' backend tests, which compare the whole 400 body: 17 failing tests in cert-manager and 4 to 5 in others, all in the #698 sync PRs. The apps switch `fields` on, with their test assertions, when a form uses it (dev-career-portfolio first).

## Verification

- `node --test scripts/test/backend-http.test.mjs`: 15 pass. The rendered scaffold compiles and its tests pass.
- `npm run check`: see the PR.
