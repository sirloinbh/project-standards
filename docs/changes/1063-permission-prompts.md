# #1063 Stop the permission prompts in agent sessions

- Issue: [#1063](https://github.com/sirloinbh/project-standards/issues/1063)
- Branch: `chore/1063-permission-prompts`
- Parent: #1053 Agent work environment and backlog automation

## Changes — 2026-11-23

- `templates/common/.claude/settings.json.tmpl` (and the copy `.claude/settings.json`): `permissions.allow` gets `Bash`, `PowerShell`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch`. `permissions.deny` gets `rm -rf` / `rm -fr` of `/`, `/*`, `~` and `~/*`. The existing deny rules and the two `PreToolUse` hooks are unchanged.
- `docs/agent-guardrails.md`: new section "No permission prompts in a normal session (#1063)" with the trade-off.
- `scripts/test/permission-settings.test.mjs`: allow list, deny list, hook registration, and the copy equals the template.

## Decision

`permissions.defaultMode: "bypassPermissions"` was the other option, but Claude Code ignores it in project settings since 2.1.257 (documentation lookup), so it cannot be managed centrally. Broad allow rules were chosen. Where the user wants no prompts at all, `~/.claude/settings.json` can set the mode; that is a user-level change and is not made here.

## Verification

- `node --test scripts/test/permission-settings.test.mjs scripts/test/forbidden-command-hook.test.mjs`: 14 passed (force push and push to main still blocked by the hook; the deny list still has them).
- The real-session check ("a fresh session runs an issue cycle without a prompt", in this repo and one app) happens after the sync PRs merge in the apps; the lanes ran this round with prompts skipped, so they cannot show it.
