# #309 Shared backend HTTP file (error handler, 404, ID, date)

## Change

| File | Content |
|---|---|
| `templates/app/backend/src/standard/http.ts` | New centrally managed file: `errorHandler`, `notFound`, `HttpError`, `sendError`, `parseId` and `ID_PATTERN`, `serviceDate` and `serviceTimeZone`, `ApiError` |
| `templates/app/.prettierignore.tmpl` | `backend/src/standard/` (keeps the managed file hash, #154) |
| `scaffold/app/backend/src/routes/shared.ts` | Re-exports `standard/http.ts` instead of a hand-written error handler |
| `scripts/test/backend-http.test.mjs` | Managed file tests (run directly with Node type stripping) |
| `scripts/test/fixtures/sync-snapshot.json` | Added 1 file to the 8 apps |
| `docs/directory-rules.md`, `docs/design.md` | Location, status code table, app-specific errors, ID and date |

## Decisions

- The basis is study-log's error handler. Of the 8 apps, it handles the most errors (broken JSON `400`, large body `413`, other `4xx` kept, `NUL` character `22021` to `400`, `23505` to `409`).
- The file imports only types. `ZodError` is recognized by shape (`name === 'ZodError'`, an `issues` array) instead of `instanceof`. So it works with either zod 3 or 4 (#306, #307), and the central repo tests it directly with Node type stripping, without installing packages.
- ID validation uses a function `parseId(value, label)` instead of a zod schema. On failure it throws `HttpError(400)`. `ID_PATTERN` is also exported so zod schemas can use it. The rule is the same as study-log: 1 to 15 digits, no leading zero. The `"1e3"` and `" 7 "` that workout-memo's `z.coerce` accepted are not accepted.
- `HttpError` was added so a route can send the status code it wants (`throw new HttpError(404, '…')`).
- App-specific errors are not put in this file. Place the app's error middleware before `errorHandler`.
- The location is `backend/src/standard/`. It does not mix with app code, and you can tell from the name that it is a centrally managed file.

## After it reaches the apps (what to change in each app)

The sync PR only adds the file. Changing the app to use this file is done in the app repo (the user merges).

| App | What to change | What gets fixed |
|---|---|---|
| health-log, life-journal, money-ledger, english-study, dev-career-portfolio | Replace the anonymous error handler and 404 in `app.ts` with `import { errorHandler, notFound, serviceDate } from './standard/http.js'`, and delete the copies of `serviceDate` and `serviceTimeZone` | Broken JSON and large bodies give `400` and `413` instead of `500` |
| plan-routine | Same as above. Keep the ID regex (`^\d{1,18}$`) as it is, together with the string ID responses | Broken JSON `500` to `400` |
| study-log | Same as above. The route's `idParam` regex can be replaced with `ID_PATTERN` or `parseId` (same rule) | Removes duplicate code |
| workout-memo | Delete the error handler in `routes/shared.ts` and leave only the dedicated messages for `23503` and backup `413` in the app error middleware. Add `app.use('/api', notFound)`. Replace `id()` (`z.coerce`) with `parseId`, and change the goals delete `404 { ok: false }` to `404 { error }` | A missing `/api` path gives a JSON 404 instead of HTML, ID `"1e3"` is rejected, and the delete failure body is unified |

The workout-memo part was opened separately as sirloinbh/workout-memo#172 (#241 candidate E).

## Checks

- `node --test scripts/test/backend-http.test.mjs`: 7 passed (broken JSON `400`, large body `413`, other `4xx`, zod error `400`, `HttpError`, `22021` and `23505`, `500` and logging, JSON 404, ID boundary values, Asia/Seoul date boundary)
- Type-checked the managed file and the scaffold `routes/shared.ts` with `strict` and `NodeNext`, using TypeScript 5.9.3 and `@types/express` and `@types/pg` installed in workout-memo: no errors
- Checked with the 1.1.0 shared config applied through the same app's ESLint: no violations. Formatted with the shared Prettier config
- The result of `npm run check` is written in the PR
