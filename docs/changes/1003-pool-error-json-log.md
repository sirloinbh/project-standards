# #1003 Log pool connection errors as one JSON line in createPool

## Change

- `templates/app/backend/src/standard/db.ts`: the default `log` of `createPool` writes one JSON line with `console.error`: `time`, `level: "error"`, `message` (`Database connection failed`), `error` (the error's message) and `code` when the error has one (for example `ECONNRESET`). No stack trace. The line has the same shape as the request log. The optional `log(message, err)` parameter is unchanged, so an app can still pass its own logger.
- `scripts/test/backend-db.test.mjs`: a test emits `error` on the pool and on a client and checks one parseable JSON line, with the process still running.

## Reason

`console.error(message, err)` printed a multi-line stack trace next to single-line JSON request logs (plan-routine#156). The listener and the no-exit behavior were already in place (#832).

## Notes

- The pool-level `error` listener stays quiet: pg reports an idle client's failure on the pool and on the client, and the client listener already logs it, so the pool listener would log it twice (#832). A test confirms one line per lost connection, not one per event source.

## Verification

- `node --test scripts/test/backend-db.test.mjs`: 8 pass.
- Rule 9 and `npm run check`: see the PR.
