# #998 Turn on the query feature for dev-career-portfolio

- Issue: [#998](https://github.com/sirloinbh/project-standards/issues/998)
- Branch: `chore/998-dev-career-portfolio-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/dev-career-portfolio#152

## Changes — 2026-11-22

Set `features.query` to `true` for dev-career-portfolio in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to dev-career-portfolio. `@tanstack/react-query` 5.104.1 is installed in dev-career-portfolio's frontend by sirloinbh/dev-career-portfolio#211 (same order as health-log, #976, and cert-manager, #995: install first, then this flag, then the sync PR, then the screen migrations). The reviewed sync snapshot gains the two files for dev-career-portfolio.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` for dev-career-portfolio. On a Mac 5 unrelated tests fail the same way as on a clean `origin/main` (2 backup tests, 2 vendored-copy tests, 1 scaffold standards-check test); CI on Linux is the check of record.
- `registry:check`, `docs:check`, `tokens:check`, `self:check`, `packages:check`, `workflows:check`, `secrets:check`: all pass.
- `npm run sync:preview`: `.local/sync-preview/dev-career-portfolio/frontend/src/lib/query.ts` and `query.test.tsx` are listed. The file imports `RequestError` and `requestJson` from `./api`; dev-career-portfolio's `lib/api.ts` exports both, with the `kind` field the retry rule reads.
