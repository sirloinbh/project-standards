# #368 Show an apply notice at session start on PCs whose global instructions have the old rule

## Change

| File | Content |
|---|---|
| `templates/common/.claude/hooks/pc-setup-notice.mjs` and its copy | Added a `SessionStart` hook that finds the Fork rule section in the global instructions and shows a notice |
| `templates/common/.claude/settings.json.tmpl`, `.claude/settings.json` | Registered the hook |
| `scripts/test/pc-setup-notice.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | Hook test, synced file list |
| `docs/user-steps.md`, `docs/agent-guardrails.md` | Recorded when the notice appears and its limits |

## Decisions

- On a PC that already applied the change, it prints nothing. It decides by the actual content of the global instructions, not by date or PC name.
- It looks only for a section with `Fork` in the heading (`## `). A mention of Fork in the body is not a target of the notice.
- It goes into the central shared template so it appears even when work starts in an app repo.
- The notice goes to both the user's screen (`systemMessage`) and the agent context (`additionalContext`).
- It is a notification-only hook, so it does not use `onFailure: "block"`.

## Limits

- The hook is in the repo, so it appears from the session in which that PC's clone has received this change. There is no way to fix a file outside the repo on another PC.
- It does not appear in Codex sessions.
