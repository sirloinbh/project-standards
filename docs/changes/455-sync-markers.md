# #455 Switch the sync header and commit prefix to English

Two markers that the sync tools write into every app were Korean. Tools match on them, so they are switched with the old form still recognized.

## Changes

| Marker | Before | After | Old form |
|---|---|---|---|
| Managed file header (`scripts/lib/render.mjs`) | `중앙 관리 파일. 수정은 sirloinbh/project-standards의 <dir>/에서` | `Managed file. Edit it in sirloinbh/project-standards <dir>/` | `hasHeader` still accepts it (`LEGACY_HEADER_TEXT`) |
| Sync commit and PR title (`scripts/lib/sync-pr.mjs`) | `chore: 중앙 표준 동기화 (project-standards@<sha>)` | `chore: sync central standards (project-standards@<sha>)` | Commits with the old prefix still count as bot commits, so an open sync PR from before this change is updated, not kept (#367) |
| Sync commit body | `- 왜: … / - 변경: 중앙 관리 파일 N개` | `- Why: … / - Changes: N managed files` | — |

- The English header was already used for `.ps1` files. Now every file uses it, so `HEADER_TEXT` is the English text and `HEADER_TEXT_ASCII` is an alias.
- The next sync changes the first line of every managed file in every app. The content check (`.standards/check.mjs`) compares against the manifest, so it is not affected.

## Not changed here

- The release marker `- 배포 실행:` in `publish.yml`. `sync-pr.mjs` reads only the run URL from the release body, so it can change freely; it is left to the workflows translation PR.

## Verification

- `npm run check`: pass.
- New tests: a Korean header still counts as a header; a sync branch whose extra commit has the old Korean prefix is updated, not kept.
