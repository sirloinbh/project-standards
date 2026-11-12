# #489 Translate change records 1-99 to English

## Problem

The change records in `docs/changes/` for issues 1 to 99 were written in Korean. The project now writes all documents in English (#453).

## Change

- Translated the 34 Korean files in `docs/changes/` whose names start with an issue number from 1 to 99. Another change handles 100 to 199.
- Kept headings' structure, tables, code, commands, file paths, identifiers, issue and PR numbers, and dates unchanged.
- Kept these Korean strings because they are literal text (output, app messages, or header text) quoted from code, each with an English gloss:
  - `중앙 관리 파일` (central managed file header) in `36-deploy-templates.md`
  - `서버 오류가 발생했습니다` and `저장소에 연결할 수 없습니다…` (app error messages) in `30-api-rules.md`
  - `병합 전에 확인해 주세요` (PR template section title) in `63-sync-pull-requests.md`
  - `(비밀)` and `확인 못 함` (report output) in `82-compliance-report.md`
- No source, template, or copy files changed.

## Checks

- `UPDATE_SNAPSHOT=1 npm test` and `npm run check`: see the PR.
- Hangul search over the 34 files leaves only the kept strings above.
