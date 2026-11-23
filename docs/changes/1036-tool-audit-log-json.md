# #1036 Log a failed AI tool audit write as one JSON line with level error

## Change

- `templates/app/backend/src/standard/tools.ts`: the default `log` of `registerToolRoutes` writes one JSON line with `console.error`: `time`, `level: "error"`, `event: "audit_write_failed"`, `message`, `error` (the error's message) and `code` when present. No stack trace. The optional `log` parameter is unchanged.
- `scripts/test/backend-tools.test.mjs`: a test with a failing audit table and the default logger checks one parseable line with `"level":"error"`, and that the caller still gets the 403.

## Reason

The old default, `console.error(message, err)`, printed a multi-line stack trace without a `"level":"error"` field. The daily report (`deploy/report.sh`, ADR-0021) counts only lines containing `"level":"error"`, so a broken `audit_log` table, the case this log exists for, never reached the alert. Same gap as #1003 for `createPool`.

## Verification

- `node --test scripts/test/backend-tools.test.mjs`: all pass.
- Rule 9 and `npm run check`: see the PR.
