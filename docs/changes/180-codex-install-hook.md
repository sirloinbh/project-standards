# #180 Add an npm install blocking hook to Codex

## Decision

Add a `PreToolUse` hook to Codex too, and reuse the Claude Code hook script (`.claude/hooks/block-package-installs.mjs`) as it is. The Codex rules (`.codex/rules/package-installs.rules`) compare literal text, so they cannot block `npm --silent install`, full paths, or an unsplit `sh -c`, but the hook blocks these forms. A Codex hook does not block when it fails, and it runs only after the user trusts it, so it supplements the rules and does not replace them.

## Research

We checked the official docs (https://learn.chatgpt.com/docs/hooks.md) and the openai/codex `main` source (2026-10-22).

- **Input:** A shell command (`exec_command`) reaches the hook as `tool_name: "Bash"` and `tool_input: {"command": <string>}` (`codex-rs/core/src/tools/hook_names.rs`, `handlers/unified_exec/exec_command.rs`). The name is `Bash` on Windows too. The script's input handling does not need to change.
- **How to block:** Exit code 2 with a reason on stderr, or `permissionDecision: "deny"` JSON. Same as Claude Code.
- **Config format:** `hooks.PreToolUse[].matcher` and `hooks[]` in `<repo>/.codex/hooks.json`. The command hook fields are `type`, `command`, `commandWindows`, `timeout` (seconds, default 600), `async`, `statusMessage`, and `additionalContextLimit`. The top level of the file rejects unknown fields (`codex-rs/config/src/hook_config.rs`).
- **How it runs:** On macOS and Linux it runs as `$SHELL -lc <command>`, on Windows as `%COMSPEC% /C "<command>"` (raw), and the working folder is the session folder (`codex-rs/hooks/src/engine/command_runner.rs`). There is no project folder variable, so the docs recommend `git rev-parse --show-toplevel`.
- **Trust:** The project `.codex/` must be trusted to be read, and an unmanaged hook runs only after it is reviewed and trusted in `/hooks`. The trust is recorded as a hash of the hook definition, so a change needs trust again.
- **Behavior on failure:** Only exit code 2 (with a reason) and deny block. Other exit codes, timeouts, and failures to run are reported as failures and the tool runs (`codex-rs/hooks/src/events/pre_tool_use.rs`; `should_block` is true only on the blocking path). There is no setting like `onFailure: "block"`.

## Change

| File | Content |
|---|---|
| `templates/common/.codex/hooks.json.tmpl` | A `PreToolUse` `Bash` hook, `timeout: 10`, `statusMessage`. The command finds the root with `node -e` and `git rev-parse --show-toplevel` and calls the hook's `main()` |
| `templates/common/.claude/hooks/block-package-installs.mjs` | Exports `main` and notes the Codex use in a comment. The verdict and Claude Code behavior are unchanged |
| `.codex/hooks.json`, `.claude/hooks/` (central) | Same files as the template |
| `templates/app/.prettierignore.tmpl` | `.codex/hooks.json` (centrally managed files are not formatted in apps) |
| `scripts/test/package-install-hook.test.mjs` | The Codex config shape and a match with the central copy, and running the config's command the way Codex runs it, from the root and a subfolder, to check blocking and allowing |
| `scripts/test/fixtures/sync-snapshot.json` | Added `full .codex/hooks.json` for the 9 repos |
| `docs/agent-guardrails.md` | The section "Using the same hook in Codex", limits, how to change it, sources |

Decisions:

- **One command line, no `commandWindows`:** At first we tried `for /f … in ('git rev-parse --show-toplevel') do node "%r/…"` for cmd, but a Korean-named path (for example a folder named "문서", which means "Documents") got garbled in cmd and the hook could not be found. If `node -e` finds the root, the path does not pass through the shell. This string has no characters that sh or cmd would change inside double quotes, so the same string works in both shells.
- **Minimal fields:** We did not add top-level fields such as `description` that appear in the docs. An older Codex that does not know such a field might reject the whole file.
- **Script location:** We do not keep a copy in `.codex/hooks/`; we share the script in `.claude/hooks/`. The verdicts of the two tools cannot drift apart.

## Verification

- `node --test scripts/test/package-install-hook.test.mjs`: 8 passed. The new test used Windows `cmd.exe /C "<command>"` from the repo root and from `scripts/test` and confirmed exit code 2 for `npm --silent install` and `& "C:\…\npm.cmd" ci`, and 0 for `npm ls`.
- We also ran the same command by hand with Git Bash `bash -lc` and confirmed block 2 and allow 0.
- `UPDATE_SNAPSHOT=1 npm test`: the only snapshot change is the added `full .codex/hooks.json` for the 9 repos.
- `npm run check` passed (385 of 386 tests passed; the 1 real Codex CLI verdict test was skipped because the CLI is not installed).
- **Not done:** This PC has no Codex CLI, so we could not check hook trust (`/hooks`) and blocking in a real Codex session, or the `codex execpolicy check` verdicts of #178. The user checks them on their PC (the PR's "Check before merging").

## Additional verification (2026-10-23)

Codex CLI 0.144.4 was installed on the central PC, so we ran the `codex execpolicy check` verdicts that could not be done in the PR.

- `node --test scripts/test/agent-guardrails.test.mjs scripts/test/package-install-hook.test.mjs`: all 13 passed, 0 skipped. The Codex CLI verdict test ran for real for the first time.
- Manual verdicts (`templates/common/.codex/rules/package-installs.rules`): `npm u react`, `npm ic`, `npm sit`, `npm install-clean`, `npm unlink x`, `npm rb`, `npm ddp`, `npm innit`, `npm upd`, `npm uni x`, and `npm installTest` are `forbidden`. `npm run check`, `npm ls`, and `npm audit` are not caught by the rules. `npm --silent install` is also not caught (a limit of the rules, supplemented by the hook).
- **Remaining:** Trusting the hook with `/hooks` in a real Codex session and checking that `npm --silent install --help` is blocked needs an interactive session, so the user does it.
