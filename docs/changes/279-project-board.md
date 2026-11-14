# #279 One Projects board for the open app issues

## Background

The user created the board `sirloinbh apps` (number 5) and added the `project` scope to the personal gh token (#278). The board had 22 items and only the default fields.

## Change

- `tools/project-board.mjs`: `plan` (read-only) and `sync` (after a confirmation question, or `--yes`). It adds the open issues of the `labels.mjs` repos (sync targets and file-control) that are not on the board, and sets the single-select field Priority from `priority/P0`–`P4`. It never creates fields: without a usable Priority field it explains how to add one and stops before reading items. It never removes items.
- `tools/project-board.mjs`, `tools/labels.mjs`: run `gh-project.ps1` with `-ExecutionPolicy Bypass`. Without it, Windows' default policy refused to load the script (found on the first real `plan`).
- `scripts/test/project-board.test.mjs`: 5 tests with a fake gh (`BOARD_GH`).
- `docs/tools.md`: usage and the verification line.

## Verification

- `node --test scripts/test/project-board.test.mjs`: 5 passed.
- Real board, `plan`: reached the board and stopped with the guidance, because the board has no Priority field yet.
- `npm run check` (Git Bash): see the PR.

## Next

- The user adds the Priority field (single select, P0–P4). Then `sync`, and the counts go on #279.
