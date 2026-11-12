# #490 Translate the change records for issues 200 to 299 into English

## Problem

Many files in `docs/changes/` whose names start with an issue number from 200 to 299 were written in Korean. The project now writes documents in English (#453).

## Change

| File | Content |
|---|---|
| `docs/changes/2NN-*.md` (41 files) | Translated to English. Headings keep their structure; code blocks, commands, file paths, identifiers, issue and PR numbers, and dates are unchanged |
| `docs/changes/490-translate-changes-200-299.md` | This record |

Korean text kept on purpose:

- Quoted error text, with an English gloss added: `@sirloinbh/design-tokens — 설치되어 있지 않습니다(기대 버전 1.0.0)` (#211) and `없음` (#219).
- Names of labels and organization-side items that exist in other repos: the old label names in #277 (`P0 긴급`, `P1 높음`, `P2 보통`, `P3 낮음`, `P0 선행 필수`, `P3 매우 후순위`, `우선순위: P0`, `특성: 안전`, `기능: 루틴`, `작업: UI`, `추적`) and the `[직접]` label in #255.

## Checks

- `UPDATE_SNAPSHOT=1 npm test` and `npm run check`: see the PR body.
- Hangul search (`[가-힣]`) over the files in scope: see the PR body.
