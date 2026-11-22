# #995 Turn on the query feature for cert-manager

- Issue: [#995](https://github.com/sirloinbh/project-standards/issues/995)
- Branch: `chore/995-cert-manager-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/cert-manager#161

## Changes — 2026-11-22

Set `features.query` to `true` for cert-manager in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to cert-manager. `@tanstack/react-query` 5.104.1 is installed in cert-manager's frontend by sirloinbh/cert-manager#201 (same order as health-log, #976: install first, then this flag, then the sync PR, then the screen migrations). The reviewed sync snapshot gains the two files for cert-manager.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` for cert-manager. On a Mac 5 unrelated tests fail the same way as on a clean `origin/main` (backup and vendored-copy tests); CI on Linux is the check of record.
- `npm run sync:preview`: `.local/sync-preview/cert-manager/frontend/src/lib/query.ts` and `query.test.tsx` are listed. The file imports `RequestError` and `requestJson` from `./api`; cert-manager's `lib/api.ts` exports both, with the `kind` field the retry rule reads.
- `npm run docs`: nothing stale.
