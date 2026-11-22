# #1013 Turn on the query feature for life-journal

- Issue: [#1013](https://github.com/sirloinbh/project-standards/issues/1013)
- Branch: `chore/1013-life-journal-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/life-journal#158

## Changes — 2026-11-23

Set `features.query` to `true` for life-journal in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to life-journal. The reviewed sync snapshot gains the two files for life-journal.

Order differs from study-log (#1009) and money-ledger (#1006): life-journal has `knipStrict: true`, so an install-only PR there fails the CI knip step (`@tanstack/react-query` unused). The install (`@tanstack/react-query` 5.104.1, reconfirmed by the user on life-journal#158, 2026-11-23) is added as a commit to the life-journal sync PR that brings `query.ts`, as AGENTS.md allows (its message does not start with `chore: sync central standards`).

`features.contract` is already `true` for life-journal, so it needs no change.

## Verification

- `UPDATE_SNAPSHOT=1 npm test` on Windows: 614 pass, 0 fail (5 skipped); the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` in the `sirloinbh/life-journal` section.
- `npm run check`: pass.
