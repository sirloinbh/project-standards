# #512 Allow the quoted legacy header name in the Korean-text check

- Issue: [#512](https://github.com/sirloinbh/project-standards/issues/512)
- Branch: `fix/512-allow-legacy-header-quote`
- Date: 2026-11-14 (Asia/Seoul)

## Problem

The Korean-text column of the compliance report (#493) listed `AGENTS.md` in every app repo. The only Korean in it is the quoted old header name `"중앙 관리 파일"`, which `templates/app/AGENTS.md.tmpl` keeps on purpose so readers can recognise older managed files. The allow list had only the full legacy header sentence.

## Change

- `scripts/lib/korean-text.mjs`: added `"중앙 관리 파일"` (with the quotes) to `DEFAULT_ALLOW`.
- `scripts/test/compliance.test.mjs`: an `AGENTS.md` line with the quote is not counted, and a line with the quote plus other Korean still is.

## Checks

- `npm run check`: see the PR.
