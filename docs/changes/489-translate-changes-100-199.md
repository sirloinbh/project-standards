# #489 Translate the change records #100-#199 to English

## Problem

Many files in `docs/changes/` were written in Korean. The project now writes new documents in English, and existing Korean documents are translated in sub-issues of #453. This record covers the second half of #489: the files whose names start with an issue number from 100 to 199. The records for #1-#99 are translated in a separate PR.

## Change

- Translated 30 files in `docs/changes/` (issue numbers 113 to 198) to English. Headings, tables, code blocks, commands, paths, identifiers, issue and PR numbers, and dates are unchanged.
- Kept three quoted Korean strings, each with an English gloss in parentheses:
  - `FORM · 나의 운동 기록` (an app display name) in `122-neutral-light-dark.md`
  - `인터넷에 연결되어 있지 않습니다` (offline page text) in `125-pwa-baseline.md`
  - `문서` (an example Korean folder name) in `180-codex-install-hook.md`
- No source file with copies was edited, so no copies needed updating.

## Checks

- `UPDATE_SNAPSHOT=1 npm test`: see the PR body for the result and whether the snapshot changed.
- `npm run check`: see the PR body for the result.
- Hangul search (`[가-힣]`) over `docs/changes/` files numbered 100 to 199: only the three quoted strings above remain.
