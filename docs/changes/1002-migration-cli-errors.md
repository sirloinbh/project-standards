# #1002 Make the managed migration CLI fail cleanly on connect and unlock errors

## Change

- `templates/app/backend/src/standard/migrate.ts.tmpl`: `client.connect()` moved inside the `try`, so a wrong host or a stopped database prints one line and exits 1 instead of an unhandled stack trace. The catch prints the message plus the error's `cause` (the PostgreSQL detail) on the same line, unless the message already contains it. `client.end()` errors are swallowed so they cannot hide the real one.
- `templates/app/backend/src/standard/migrations.ts`: when the final `unlock` fails after every file committed, `migrate()` logs one line and returns the applied files. The server releases a session lock when the session ends anyway.
- `scripts/test/backend-migrations.test.mjs`: the old "reports an unlock failure" test now expects the applied files and one log line; a new test runs the rendered CLI against a stub `pg` whose `connect()` rejects and checks exit code 1 and one line of output.

## Reason

Found in plan-routine#159. Unknown flags still exit with code 2 (unchanged).

## Verification

- `node --test scripts/test/backend-migrations.test.mjs`: 12 pass.
- Rule 9 and `npm run check`: see the PR.
