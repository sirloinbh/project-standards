# #673 Map PostgreSQL input errors to 400 and respect sent headers

## Change

- `templates/app/backend/src/standard/http.ts`: `errorHandler` calls `next(err)` first when `res.headersSent` is true, so an error after the response started no longer throws `ERR_HTTP_HEADERS_SENT` inside the handler. SQLSTATEs `23503` (foreign key), `23514` (check), `22P02` (invalid text format), `22007` and `22008` (invalid date or time) now answer 400 with a short English message that never repeats the database text; before they fell through to a logged 500.
- `scripts/test/backend-http.test.mjs`: each code, and the headers-sent path.

## Reason

Reported by plan-routine, study-log, cert-manager, dev-career-portfolio and life-journal: wrong status and logged 500s for client input.

## Choice made

- `23503` is also raised when a delete is blocked by a referencing row; the issue asks for 400, so the message covers both ("does not exist or is still in use"). An app that needs a 409 for that case handles it in its own `appErrors`.

## Verification

- `node --test scripts/test/backend-http.test.mjs`: pass. `npm run check`: see the PR.
