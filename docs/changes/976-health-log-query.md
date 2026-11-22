# #976 Turn on the query feature for health-log

- Issue: [#976](https://github.com/sirloinbh/project-standards/issues/976)
- Branch: `chore/976-health-log-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/health-log#220

## Changes — 2026-11-22

Set `features.query` to `true` for health-log in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to health-log. `@tanstack/react-query` 5.104.1 is installed in health-log's frontend by sirloinbh/health-log#252 (user decision A, 2026-11-22, on sirloinbh/health-log#220: install first, then this flag, then the sync PR, then the screen migrations). The reviewed sync snapshot gains the two files for health-log.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` for sirloinbh/health-log.
- `npm run sync:preview`: `.local/sync-preview/health-log/frontend/src/lib/query.ts` and `query.test.tsx` are listed. The file imports `RequestError` and `requestJson` from `./api`; health-log's `lib/api.ts` exports both, with the `kind` field the retry rule reads.
- `npm run check`: passed (611 pass, 0 fail, 5 skipped).
