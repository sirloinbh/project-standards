# #494 Fix the duplicate header line in synced files

## Problem

After the English switch (#455, #478), synced files such as `.github/pull_request_template.md` carried two header lines in every app repo. Five central sources have a hand-written header line. In Korean it matched the old header text, so the renderer added no second header. The translation wrote "Centrally managed file. Edit it in", which does not contain `HEADER_TEXT` ("Managed file. Edit it in sirloinbh/project-standards"), so `addHeader` added its own line too.

## Change

- The hand-written header in these sources and their copies now uses the exact `HEADER_TEXT`:
  - `templates/common/.claude/hooks/block-forbidden-commands.mjs` (copy: `.claude/hooks/`)
  - `templates/common/.github/ISSUE_TEMPLATE/task.md` and `pull_request_template.md` (copies: `.github/`)
  - `templates/common/skills/std-backlog/SKILL.md` and `std-git-writing/SKILL.md` (copies: `.claude/skills/`)
- `scripts/test/render.test.mjs`: a new test fails when a template line looks like a header ("managed file. edit it in", any case) but `hasHeader` does not match it.

## Checks

- The new test fails with the old line and passes with the fix.
- `npm run sync:preview`: `workout-memo/.github/pull_request_template.md` has one header line; no preview file contains "Centrally managed file. Edit it in".
- `UPDATE_SNAPSHOT=1 npm test`: no snapshot change.
- `npm run check`: passed.
