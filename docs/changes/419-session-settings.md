# #419 Deliver messages between sessions without asking

- Issue: [#419](https://github.com/sirloinbh/project-standards/issues/419) (also records #440 and #445 results)
- Branch: `docs/419-session-settings`
- Date: 2026-11-14 (Asia/Seoul)

## Problem

Messages that an agent in another worktree sends showed an Approve/Deny dialog, and the user always chose deliver. The update channel and the subagent model check (#440, #445) had no written result.

## Change

- On this PC, `"crossSessionInbound": "accept"` and `"autoUpdatesChannel": "stable"` were set in `~/.claude/settings.json` and the Orca profile `settings.json` (user-level files, not in git). The old files were kept as `settings.json.before-419`.
- `docs/model-selection.md`: the #440 check result, the Orca profile note, a table of the other user-level settings, the MCP note, and a weekly `/usage` check.

## Checks

- Both settings files parse as JSON after the change.
- `npm run check`: see the PR.
- User step: in a new session, confirm that a message from another worktree arrives without the dialog, and comment on #419.
