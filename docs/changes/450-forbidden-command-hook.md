# #450 Block AGENTS.md prohibitions with a hook

Part of #446 (agent harness). Until now only package installs were blocked by a hook. The other prohibitions held only while the agent remembered the sentence in AGENTS.md, and `ask` rules may not stop anything when permission prompts are skipped (#418).

## Changes

| Files | Change |
|---|---|
| `templates/common/.claude/hooks/block-forbidden-commands.mjs` (+ central copy `.claude/hooks/`) | New `PreToolUse` hook. Bash/PowerShell: force push, push to `main`/`master`, package tag push, `git add` of secret files, `pr merge --delete-branch`, remote changes through the default `gh` on Windows. Edit/Write/NotebookEdit: edits of `.claude/skills/` copies. Exit 2 with the reason and the right way |
| `templates/common/.claude/settings.json.tmpl` (+ central `.claude/settings.json`) | Runs the hook after the package hook for `Bash|PowerShell`, and for `Edit|Write|NotebookEdit|MultiEdit` |
| `docs/agent-guardrails.md` | New section with the classification table (hook / permission rule / sentence), the session check, and the Codex status |
| `scripts/test/forbidden-command-hook.test.mjs` | 36 blocked and 20 allowed examples, branch-aware bare push, Windows-only gh check, secret paths, skill edits, exit codes, settings wiring, central copies |
| `scripts/test/package-install-hook.test.mjs` | Expects the second hook in the `Bash|PowerShell` entry |
| `scripts/test/fixtures/sync-snapshot.json` | The 9 synced repos get the new hook file |

## Decisions

- The hook imports `splitCommands` and `programName` from `block-package-installs.mjs` instead of copying the parser. Both files are synced together.
- The default `gh` check runs only on Windows, where the company and personal accounts share one PC (docs/tools.md). Devcontainers (Linux) are not checked. `GH_CONFIG_DIR` pointing to `gh-personal` is allowed.
- Shell copies into `.claude/skills/` stay allowed, because `cp` and `npm run skills:sync` are how the copies are made.
- Rules whose legitimate and forbidden uses look the same (subtree pushes, downstream merges, `maxRollout`) stay as sentences.
- Codex is not wired yet: changing `.codex/hooks.json` makes every repo ask for trust again. The hook already supports it (`main()` export, `Bash` events).

## Verification

- Fresh session in a throwaway repo with only the hooks configured, no remote: `claude -p --tools Bash --allowedTools "Bash(git add .env)" "Bash(git push origin main)"`. Both commands were blocked by the hook with its message, and nothing was staged.
- Not run: the same check with `--dangerously-skip-permissions`. Auto mode refused to start a session that skips permissions. The hooks docs say `PreToolUse` hooks run in every permission mode, and the `--allowedTools` run shows the hook blocks after the permission layer allowed the call.
- `UPDATE_SNAPSHOT=1 npm test`: 532 tests, 527 pass, 0 fail, 5 skipped.
- `npm run check`: pass.
