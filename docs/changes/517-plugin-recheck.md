# #517 Re-check plugins for synced repos

## Change

| File | Content |
|---|---|
| `docs/adr/0013-plugin-for-repos-outside-sync.md` | New "Re-check (#517, 2026-11-14)" section: the current Claude Code and Codex plugin docs, with sources, and the conditions for checking again |

## Result

- The decision stays. Headless `claude -p`, cloud sessions, and the GitHub Action still do not install a plugin that only the repo enables, and a missing plugin still has no required mode.
- New since ADR-0013: `claude -p --output-format stream-json --verbose` reports `plugin_errors`, and server-managed plugins reach cloud sessions. Neither removes the reason for file sync.
- Codex now documents a plugin format (root `plugin.json`, repo marketplace `.agents/plugins/marketplace.json`), but not whether `codex exec` or Codex cloud load plugins. The `tools/agents` workers stay on files.

## Verification

- `npm run check`: recorded in the PR body
