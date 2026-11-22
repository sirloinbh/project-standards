# #1004 Turn on the query feature for plan-routine

- Issue: [#1004](https://github.com/sirloinbh/project-standards/issues/1004)
- Branch: `chore/1004-plan-routine-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/plan-routine#178

## Changes — 2026-11-22

Set `features.query` to `true` for plan-routine in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to plan-routine. `@tanstack/react-query` 5.104.1 is installed in plan-routine's frontend by sirloinbh/plan-routine#221 (same order as health-log, #976, cert-manager, #995, and dev-career-portfolio, #998: install first, then this flag, then the sync PR, then the screen migrations). The reviewed sync snapshot gains the two files for plan-routine.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` for plan-routine. On a Mac 5 unrelated tests fail (2 backup tests, 2 vendored-copy tests, 1 scaffold standards-check test), the same ones #998 recorded; CI on Linux is the check of record.
- `registry:check`, `docs:check`, `tokens:check`, `self:check`, `packages:check`, `workflows:check`, `secrets:check`: all pass.
- `npm run sync:preview`: `.local/sync-preview/plan-routine/frontend/src/lib/query.ts` and `query.test.tsx` are listed. plan-routine's `frontend/src/lib/api.ts` exports `RequestError` and `requestJson`, which `query.ts` imports.
