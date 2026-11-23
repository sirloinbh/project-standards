# #1008 Cancel reads on their way before useApiMutation invalidates them

- Issue: [#1008](https://github.com/sirloinbh/project-standards/issues/1008)
- Branch: `fix/1008-mutation-cancel-reads`
- Related: #788, [ADR-0027](../adr/0027-react-query-for-data-loading.md), sirloinbh/money-ledger#277

## Changes — 2026-11-23

`useApiMutation` in `templates/query/frontend/src/lib/query.ts` now calls `cancelQueries` and then `invalidateQueries` for each `invalidate` key. React Query's `invalidateQueries` reuses a read that is already running when the query has no data yet, so a read that started before the write was stored could answer without it and the screen kept showing the old rows. After this change every read under an invalidated key starts after the write.

`query.test.tsx` has a new test: a first read starts before the write and answers last; the screen must show the data of the read that started after the write.

## Verification

- Copied into a clean workout-memo clone: `query.test.tsx` 11 passed with the change; without it the new test fails. `npm run lint` and `npm run typecheck` pass there.
- `npm run check`: passes.
