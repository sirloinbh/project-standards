# #1064 Deliver messages between local Claude sessions without asking

- Issue: [#1064](https://github.com/sirloinbh/project-standards/issues/1064)
- Branch: `chore/1064-cross-session-delivery`
- Parent: #1053 Agent work environment and backlog automation

## Changes — 2026-11-23

- Finding: `crossSessionInbound: "accept"` was already set in `~/.claude/settings.json` and in all three Orca profile settings files, and nothing in the repo sets a stricter value, yet the user still saw prompts. The Claude Code documentation names a second source: in auto mode (the user's `defaultMode`) a classifier reviews every `SendMessage` at the sender, and an allow rule for `SendMessage` skips that review.
- `templates/common/.claude/settings.json.tmpl` (copy `.claude/settings.json`): `permissions.allow` gets `SendMessage` and `ListAgents`.
- `docs/tools.md`: section "Messages between local Claude Code sessions (#1064)" with both prompts, the state on this PC, and how to diagnose a remaining prompt.
- `templates/common/skills/orca-lanes/SKILL.md` (copy `.claude/skills/orca-lanes/`): the two causes and the pre-flight check of the user-level setting.
- `scripts/test/permission-settings.test.mjs` checks the two allow entries.

## Not done here

The two-session check from the issue (a message each way with no prompt) needs the allow rule to be active in the coordinator's repo, so it can run after the sync PRs merge, in a session started afterwards. Reported to the coordinator.

## Verification

- `npm run check` passes (see the PR).
