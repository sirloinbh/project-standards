# #997 Make the migration runner type reject a pg Pool

## Change

- `templates/app/backend/src/standard/migrations.ts`: `MigrationDb` is now `Pick<ClientBase, 'query' | 'escapeLiteral'>`. `escapeLiteral` is a method of a `Client` and a `PoolClient` (one connection) but not of a `Pool`, so `const db: MigrationDb = new Pool()` no longer compiles. The CLI (`migrate.ts`) passes a `Client` and is unchanged.
- `templates/app/backend/test/standard-migrations.test.ts`: a type test with `@ts-expect-error` for a `Pool`; a `Client` and a `PoolClient` still compile. Apps run it through `npm run typecheck`.

## Reason

A `Pool` has a compatible `query`, so the old type let the advisory lock, `BEGIN`, the file and `COMMIT` run on different connections (found in money-ledger#180).

## Verification

- Rule 9: synced files copied into a clean workout-memo clone; `npm run lint` and `npm run typecheck` results are in the PR.
- `npm run check`: see the PR.
