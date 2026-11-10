# Comparing the backend API shapes of the 8 apps (#241)

Surveyed on 2026-10-28. I read `backend/src` on `origin/main` of the 8 app repos with `git show` and compared them. No code was changed. Adopted candidates are listed under "Decisions" at the bottom and will be registered as implementation issues.

The API rules and the 2026-10-22 difference table are in [directory-rules.md "API (Express)"](../directory-rules.md#api-express). This document only records what changed since then and items the rules do not cover.

## 1. Current state of the apps

| App | `backend/src` | Feature routes | Route style | OpenAPI / shared contract |
|---|---|---|---|---|
| workout-memo | 19 files | 8 groups | `register…Routes(app, pool)` in `routes/<feature>.ts` (standard) | Yes |
| study-log | 12 files | 10 groups | `Router` in `src/<feature>.ts` + `app.use('/api/<feature>')` | No |
| plan-routine | 5 files | 2 groups | Same as study-log | No |
| health-log, life-journal, money-ledger, english-study, dev-career-portfolio | `app.ts`, `server.ts` | None | — | No |

- In the 5 skeleton-only apps, `app.ts` differs only by one line, the health check's `service` name.
- The contents of the 2026-10-22 difference table still hold. workout-memo still has no "unknown `/api` path -> JSON 404".

## 2. Comparison table

| Item | workout-memo | study-log | plan-routine | 5 skeletons | Rule |
|---|---|---|---|---|---|
| Success response shape | Rows/arrays as-is (`res.json(rows)`) | Wrapped by name (`{ textbooks }`, `{ textbook }`) | Wrapped by name (`{ routines }`, `{ routine }`) | — | **None** |
| Delete success | `200 { ok: true }` | `204` (no body) | `POST /:id/archive` instead of delete | — | `200` |
| Delete target not found | 3 places `404 { error }`, **1 place (goals) `404 { ok: false }`** | `404 { error }` | `404 { error }` | — | `404 { error }` |
| Partial update | None (`PUT` only) | `PATCH` in 1 place | `PATCH` (rename), `POST /:id/move` | — | `PUT` by default. `PATCH` and action paths (`/:id/<action>`) are not mentioned |
| ID validation | `z.coerce.number().int().positive()` (`"1e3"` and `" 7 "` also pass) | Regex `^[1-9]\d{0,14}$` -> number | Regex `^\d{1,18}$`, `id::text` in the response (**string ID**) | — | **None** |
| ID column | `integer GENERATED` | `bigint` (converted to a JS number, error if out of range) | `bigint` (returned as a string) | — | **None** |
| Broken JSON / large body | `400`, `413` | `400`, `413` with dedicated messages | **`500`** | **`500`** | `400`, `413` |
| `NUL` character input (`22021`) | `500` | `400` | `500` | `500` | None |
| Today's date | `seoulToday()` + SQL `AT TIME ZONE 'Asia/Seoul'` | `serviceDate()` (`Intl`, Asia/Seoul) | Same | Same | None (all use Asia/Seoul, so they match) |
| `DATE` column | Kept as a string (`setTypeParser(1082)`) | Same | Same | Same | Same |
| List pagination | None (date range filter) | `LIMIT` in 3 places | None | — | None (not needed at current data size) |
| Retry key | `Idempotency-Key` (saving a workout record) | None | None | — | None |
| Error log | `{ event: 'request_error', message }` | Same | Same | Same | Same |
| Health check body | `{ status: 'ok' }` | `{ ok, service, today }` | Same | Same | Both allowed. Deploy and monitoring scripts only look at the status code |

## 3. The same code built separately in each app

| Code | Location | Difference |
|---|---|---|
| Error handler (`ZodError`, `23505`, body errors, 500 log) | All 8 apps. `routes/shared.ts` in workout-memo, inside `app.ts` in the others | The kinds of errors handled differ per app (section 2, "Broken JSON", "NUL") |
| 404 for unknown `/api` paths | `app.ts` of 7 apps | Missing in workout-memo |
| `serviceDate()`, `serviceTimeZone` | Copied into `app.ts` of 7 apps | Same content |
| ID parameter validation | 3 apps, each different | Section 2, "ID validation" |
| `LIKE` search term escaping (`likePattern`) | study-log `sql.ts` | An app that adds search will hit the same pitfall again |

## 4. Candidates for sharing

| # | Candidate | Approach | Verdict |
|---|---|---|---|
| A | Sync the error handler, `notFound`, `serviceDate`, and ID validation as one centrally managed file (for example `backend/src/standard/http.ts`) | Move the scaffold `routes/shared.ts` content into a template and distribute it to the 8 apps with `featureTemplates`. App-specific errors (workout-memo `23503`) are handled by an app-side handler placed first | **Recommended.** It also fixes the broken-JSON `500` in plan-routine and the 5 skeletons, and the HTML 404 for unknown paths in workout-memo |
| B | Set a success response shape rule | A rules document. New code wraps by name like study-log and plan-routine (`{ items }`, `{ item }`). workout-memo is left as is because its screens would have to change | **Recommended** (docs only) |
| C | Set an ID rule | Rules document + `idParam` from A. Positive integers of at most 15 digits, numbers in JSON. plan-routine's string IDs stay as they are, but new apps use numbers | **Recommended** |
| D | Fill gaps in the rules for delete, partial update, and action paths | Rules document. `204` (no body) is also allowed for delete success, `PATCH` for partial update, and `POST /:id/<action>` for actions | **Recommended** (docs only, matches current code) |
| E | Fix workout-memo: 404 for unknown `/api` paths, goals delete 404 body, ID `coerce` | workout-memo repo issue (included in the sync PR if A is adopted) | **Recommended** (app repo work, after user confirmation) |
| F | Add OpenAPI and a shared contract to study-log and plan-routine | One issue per app. Start with study-log (10 route groups) | On hold. Decide after #281 (MSW mocks) shows results in workout-memo |
| G | A list pagination rule | — | Not doing. Not needed at the data size of single-user apps |

## Decisions

- On 2026-10-28 the user adopted the recommendations in section 4.
- A, E: #309 (workout-memo-specific fixes are created as workout-memo issues from #309)
- B, C, D: #312
- F: on hold (after #281)
- G: not doing
