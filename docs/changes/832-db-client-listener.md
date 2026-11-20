# #832 Listen for errors on every pool client and type withTransaction for pg's Pool

## Change

- `templates/app/backend/src/standard/db.ts`:
  - `createPool` also registers `pool.on('connect', client => client.on('error', ...))`. pg stops listening on a client while it is checked out, so a connection lost inside a transaction had no listener and ended the process. The client listener logs (`Database connection failed`). The pool-level `error` listener stays, because pg emits an idle client's failure on the pool too, but it is quiet now: the same event already reaches the client listener, so it was logged twice otherwise. Apps with their own `backend/src/pool.ts` (money-ledger, life-journal) can delete it.
  - `withTransaction` has an overload for pg's `Pool` (type-only `import type { Pool, PoolClient } from 'pg'`). The callback's `client` is a `PoolClient`, so apps need no `(client: PoolClient)` annotation and can call `client.query<Row>(...)`. pg's `Pool.connect` is overloaded, which made the generic version fall back to `TxClient`. The generic overload stays for fakes and `ToolPool`.
- `scripts/test/backend-db.test.mjs`: the test covers both listeners.
- `scaffold/app/backend/src/server.ts`: comment only.

## Checks

- `node --test scripts/test/backend-db.test.mjs scripts/test/backend-tools.test.mjs`: pass. The rendered file was copied into money-ledger and life-journal: `npm run lint` and the backend typecheck pass, and a `withTransaction(pool, async (client) => client.query<{ n: number }>(...))` call without an annotation compiles (temporary file, removed). `npm run check`: see the PR.
