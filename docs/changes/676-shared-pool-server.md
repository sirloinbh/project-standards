# #676 Shared pool, withTransaction, and server.ts recipe

## Change

- `templates/app/backend/src/standard/db.ts` (managed, new): `createPool(pool, log?)` adds the pool `error` listener, and `withTransaction(pool, fn)` runs BEGIN/COMMIT/ROLLBACK once. A failed ROLLBACK releases the client with `release(true)`, so pg destroys the connection. The file imports no value from `pg`; the app passes its own `Pool`.
- `templates/app/backend/src/standard/tools.ts`: a write tool uses `withTransaction`; the `ToolPool` client type now takes `release(destroy?)`.
- `scaffold/app/backend/src/server.ts`: the pool is created with `createPool`. The SIGTERM shutdown was already in place. The bind rule belongs to lane-1's #667 and is not touched here.
- `scripts/test/backend-db.test.mjs`: listener, commit, rollback, failed ROLLBACK with `release(true)`, failed COMMIT.
- Sync snapshot updated: `backend/src/standard/db.ts` reaches every app.

## Reason

BEGIN/COMMIT/ROLLBACK was hand-written many times, and six apps had no pool error listener, so a lost idle connection could crash the process (drift D7).

## Verification

- `node --test scripts/test/backend-db.test.mjs scripts/test/backend-tools.test.mjs`: 14 pass.
- `npm run check`: see the PR.
