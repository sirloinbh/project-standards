# #162 Hook that parses commands and blocks npm installs

## Research (official docs https://code.claude.com/docs/en/hooks.md)

- **Input:** A PreToolUse hook receives JSON on stdin. `tool_name` is `Bash` or `PowerShell`, and the command to run is `tool_input.command` for both tools. The docs recommend `"matcher": "Bash|PowerShell"` for hooks that inspect shell commands.
- **How to block:** Exit code 2 blocks the tool call and shows stderr to Claude as the reason (the same as JSON `permissionDecision: "deny"`). Other non-zero exit codes do not block.
- **Behavior on failure:** By default, the command runs even if the hook fails (no script, failed start, timeout, bad output). With `"onFailure": "block"` (v2.1.295 or later), a failure is treated like exit code 2. The default timeout is 600 seconds.
- **Windows:** Shell-form hooks run with Git Bash, or PowerShell if there is none. The exec form with `args` runs without a shell and substitutes `${CLAUDE_PROJECT_DIR}`.
- Even when a hook gives deny, `permissions.deny` is evaluated separately, so the two mechanisms work together.

## Change

| File | Content |
|---|---|
| `templates/common/.claude/hooks/block-package-installs.mjs` | Hook script (Node built-in modules only). Splits the command into simple commands, parses npm arguments against the npm 11 command and alias list, and re-parses commands inside `sh -c`, `pwsh -Command`, `cmd /c`, `eval`, and so on. Exit code 2 for install-type commands |
| `templates/common/.claude/settings.json.tmpl` | `hooks.PreToolUse`: exec form for `Bash|PowerShell` (`node` + `${CLAUDE_PROJECT_DIR}/.claude/hooks/…`), `timeout: 10`, `onFailure: "block"` |
| `.claude/settings.json`, `.claude/hooks/` (central) | Same files as the template |
| `templates/app/.prettierignore.tmpl` | `.claude/hooks/` (#154 rule: centrally managed files are not formatted in apps) |
| `scripts/test/package-install-hook.test.mjs` | 45 commands to block, 20 commands to allow, the exit code of the hook process, the settings shape, and a match with the central copy |
| `scripts/test/fixtures/sync-snapshot.json` | Added `full .claude/hooks/block-package-installs.mjs` for the 9 repos |
| `docs/agent-guardrails.md` | Hook section, check results, limits, how to change it, sources |

Decisions:

- **Sync to the 9 repos:** Yes. Like the deny list (#16), it is a fully managed file in `templates/common/`, so standards-check verifies it by hash.
- **npx, pnpm, yarn, bun, and so on:** Block them all without parsing arguments. This is the same standard as the deny list, and these repos use only npm.
- **Block on failure (fail-closed):** If `node` or the script is missing, both the Bash and PowerShell tools are blocked. All the repos are Node projects, so we chose this side.
- **Avoiding false positives:** The text `npm install` inside a commit message, here-document, here-string, comment, or the argument of another command is not blocked.

## User decisions (2026-10-22)

- Keep `onFailure: "block"`. This field needs Claude Code v2.1.295 or later (noted in `docs/agent-guardrails.md`).
- Merge with the current scope.
- The npm aliases missing from the Codex rules and the deny list (`u`, `ic`, `sit`, `rb`, `ddp`, `unlink`, `innit`) and the bypass forms Codex cannot block are handled in the follow-up issue #178.

## Verification

- Checked for real with `claude -p` (Claude Code 2.1.308, Windows, this branch): Bash `npm --silent install --help`, `sh -c "npm i --help"`, `"/c/Program Files/Volta/npm.exe" install --help`, PowerShell `npm --silent install --help`, and `& "C:\Program Files\Volta\npm.cmd" ci --help` were denied by the hook. Bash and PowerShell `npm ls --depth=0` and Bash `npm run` ran. We added `--help` so no install would happen.
- `npm run check` passed (after merging the latest main (#174), 187 of 188 tests passed; the 1 real Codex CLI verdict test was skipped because the CLI is not installed).
