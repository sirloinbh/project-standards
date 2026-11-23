# #1098 Roll back the managed permission allow rules from #1063 and #1064

## Why

The user asked on 2026-11-24 to roll back the permission changes, because sessions have asked for approval much more often since they landed.

## Changes

| File | Change |
|---|---|
| `.claude/settings.json`, `templates/common/.claude/settings.json.tmpl` | Back to their state before efada15: the broad `Bash`, `PowerShell`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch` allow rules, the extra `rm -rf` deny rules (#1063) and the `SendMessage` / `ListAgents` allow rules (#1064) are removed |
| `scripts/test/permission-settings.test.mjs` | Removed with the rules it tested |
| `docs/agent-guardrails.md` | The #1063 section is removed |
| `docs/tools.md`, `.claude/skills/orca-lanes/SKILL.md`, `templates/common/skills/orca-lanes/SKILL.md` | The #1064 cross-session notes are removed |

The change records `docs/changes/1063-permission-prompts.md` and `docs/changes/1064-cross-session-delivery.md` stay as history.

## Tests

- `npm run check`: see the PR.

## Notes

- The other repos get the old settings back through their sync PRs. A running session keeps the settings it started with; restart it after the sync PR merges.
- The user-level `crossSessionInbound: accept` setting was never changed by #1064 and stays.
