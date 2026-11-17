# 552. Request IDs and JSON request logs

## Change

- `templates/app/backend/src/standard/http.ts` (managed): `requestLog` keeps a valid incoming `X-Request-Id` or creates a UUID, returns it in the `X-Request-Id` response header, stores it on `res.locals.requestId`, and logs one JSON line per request (`time`, `level`, `requestId`, `method`, `path` without the query, `status`, `ms`). The 500 line from `errorHandler` now carries `time`, `level` and the same `requestId`.
- `templates/app/frontend/nginx.conf.tmpl` (managed): passes the caller's `X-Request-Id`, or nginx's `$request_id`, to the API.
- `scaffold/app/backend/src/app.ts`: `app.use(requestLog)` first, before the sign-in.
- `scripts/standards-check.mjs`: warns when `backend/src/app.ts` has no `app.use(requestLog)`.
- `docs/logging.md`: the format and how to search it; `docs/directory-rules.md` lists the new middleware.

## Reason

- Debugging across 8 compose stacks meant matching timestamps by hand. The audit log (#553) and the AI tool calls (ADR-0017) reuse the request ID.
- No logger package (`pino`): the middleware is small with Node built-ins, and the logs stay in `docker compose logs` until log collection is decided (#554).

## Verification

- `node --test scripts/test/backend-http.test.mjs`: 11 pass (new: the header, one JSON line without the query, a valid incoming ID kept and an invalid one replaced, 4xx `warn` and 5xx `error`, the error line carrying the request ID).
- `npm run check`: see the PR.

## Follow-up

- `backend/src/app.ts` is app-owned: each app adds `app.use(requestLog)` after the sync, in its own PR. Until then the standards check warns in the compliance report.
