# #1009 Turn on the query feature for study-log

- Issue: [#1009](https://github.com/sirloinbh/project-standards/issues/1009)
- Branch: `chore/1009-study-log-query`
- Parent: #788 (ADR-0027); adoption issue sirloinbh/study-log#287

## Changes — 2026-11-23

Set `features.query` to `true` for study-log in `registry/projects.json`, so the sync adds `frontend/src/lib/query.ts` and `query.test.tsx` to study-log. `@tanstack/react-query` 5.104.1 is installed in study-log's frontend by sirloinbh/study-log#328, and its `frontend/src/lib/api.ts` is the synced client since sirloinbh/study-log#323 (same order as money-ledger, #1006: install first, then this flag, then the sync PR, then the screen migrations). The reviewed sync snapshot gains the two files for study-log.

## Verification

- `UPDATE_SNAPSHOT=1 npm test` on macOS: 591 pass, 5 fail, and the only snapshot change is `full frontend/src/lib/query.test.tsx` and `full frontend/src/lib/query.ts` for study-log. The 5 failures are macOS shell differences unrelated to the flag (the backup restore message pads the table count with spaces, and the vendored `ioc-scan` and scaffold-without-contract cases); CI on Linux is the check for them.
- `npm run check`: see the PR.
