# #1006 Turn on the query feature for money-ledger

- Issue: [#1006](https://github.com/sirloinbh/project-standards/issues/1006)
- Branch: `chore/1006-money-ledger-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/money-ledger#213

## Changes — 2026-11-23

Set `features.query` to `true` for money-ledger in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to money-ledger. `@tanstack/react-query` 5.104.1 is installed in money-ledger's frontend by sirloinbh/money-ledger#271 (same order as health-log, #976, cert-manager, #995, dev-career-portfolio, #998, and plan-routine, #1004: install first, then this flag, then the sync PR, then the screen migrations). The reviewed sync snapshot gains the two files for money-ledger.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: 613 pass, 0 fail, 5 skipped; the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` for money-ledger.
- `npm run check`: passed (test, registry, docs, tokens, self, packages, workflows and secrets checks).
- `npm run sync:preview`: `.local/sync-preview/money-ledger/frontend/src/lib/query.ts` and `query.test.tsx` are listed. money-ledger's `frontend/src/lib/api.ts` exports `RequestError` (with `kind`) and `requestJson`, which `query.ts` imports.
- The two preview files copied into a money-ledger checkout with the package installed (#271's branch): `vitest run src/lib/query.test.tsx` 10 passed, frontend `tsc --noEmit`, ESLint and Prettier clean. The copies were removed afterwards; the sync PR brings them.
