# #491 Translate change records 300 and above and the daily logs to English

Part of the English switch (#453).

## Problem

Change records in `docs/changes/` with an issue number of 300 or more, and the files in `docs/daily/`, were still partly or fully in Korean. Most of the change records (#447 and later) were already English, and the rest were Korean.

## Change

- Translated 49 files to English: 4 files in `docs/daily/` (`README.md`, `2026-11-01.md`, `2026-11-02.md`, `2026-11-05.md`) and 45 files in `docs/changes/` (#303 to #434, 45 files). The rest of `docs/daily/2026-11-11.md` and the other files were already English.
- Updated the anchors that point to translated headings: `2026-11-01.md#사용자` is now `#user`, and `2026-11-02.md#에이전트` and `#사용자` are now `#agent` and `#user`.
- Did not touch `docs/daily/2026-11-12.md` (another session may still append to it) or any file with an issue number below 300.

## Korean kept on purpose

Korean that is data, or that code matches on, stays as it was, with an English gloss where it appears in prose.

- The legacy sync commit prefix `chore: 중앙 표준 동기화 (project-standards@` and the legacy header `중앙 관리 파일. 수정은 sirloinbh/project-standards의`.
- Quoted old UI and error strings, such as the old-to-new table in #457, and `"<파일> 적용 실패: <원인>"` in #414.
- Registry values in #347, #399, and #471 (app names and summaries), the `[직접]` marker, `완료 기준`, `예|네`, and the `- 배포 실행:` release marker.
- Korean quoted UI labels and example strings in the daily logs and in #310, #326, and #367.

## Checks

- `UPDATE_SNAPSHOT=1 npm test`: 542 tests, 537 pass, 0 fail, 5 skipped; the snapshot did not change.
- `npm run check`: pass.
- Hangul search (`[\uAC00-\uD7A3]`) over the scope: only the kept strings above remain.
