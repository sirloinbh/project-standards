# #178 Add the missing npm aliases to the Codex rules and the deny list

## Research

- **npm aliases:** In `lib/utils/cmd-list.js` of npm 11.19.0 (bundled with Node 24.21.0), 45 names resolve to the 11 install-type commands (`install`, `ci`, `install-test`, `install-ci-test`, `update`, `uninstall`, `exec`, `init`, `rebuild`, `dedupe`, `link`). Of these, 10 were missing from the deny list and the Codex rules: `u`, `ic`, `install-clean`, `isntall-clean`, `clean-install-test`, `sit`, `rb`, `ddp`, `unlink`, `innit`.
- **Abbreviations and camelCase:** npm also accepts a leading part that does not collide with another name (`upd`) and camelCase (`installTest` → `install-test`). We resolved the leading parts of all commands and aliases, and their camelCase forms, with npm's `deref`, and found 102 more forms that become install commands. The hook's `npmCommand` gave the same result as npm for all these candidates.
- **Codex rules (https://learn.chatgpt.com/docs/agent-configuration/rules):** `pattern` accepts only literal words or word groups. For `bash -lc`, `sh -c`, and `zsh -c`, a script made only of words and `&&` `||` `;` `|` is split and the rules apply to each part; if there are redirections, substitutions, environment variables, wildcards, or control statements, it is not split. There is no mention of shortening a full path to the program name.
- **Codex hooks (https://learn.chatgpt.com/docs/hooks.md):** `PreToolUse` hooks are on by default, shell commands match as `Bash`, and they use `tool_input.command` and exit code 2. The user must review and trust the hook definition before it runs, and if a hook fails it does not block the tool call. The docs say hooks are not a complete enforcement boundary.

## Change

| File | Content |
|---|---|
| `templates/common/.claude/settings.json.tmpl` | Added the 10 missing aliases to the Bash and PowerShell deny lists (86 rules → 106 rules) |
| `templates/common/.codex/rules/package-installs.rules` | Added the same 10 aliases to the first rule. Added a second `forbidden` rule listing the 102 abbreviations and camelCase forms (with `match` and `not_match` examples) |
| `.claude/settings.json`, `.codex/rules/` (central) | Same files as the template |
| `scripts/test/agent-guardrails.test.mjs` | The 10 new aliases in the required list. Checks that every word in the Codex list becomes an install command in the hook's `npmCommand`, and that abbreviation and camelCase forms of the listed words are not missing. Added the new aliases and `npm test` to the Codex CLI verdict examples |
| `docs/agent-guardrails.md` | Blocked commands, check results, forms Codex cannot block and the reasons, Codex hook review, how to change it, sources |

Decisions:

- **Abbreviations and camelCase went only into the Codex rules.** Claude Code blocks them because the hook parses them, and the hook blocks the command if it fails (`onFailure: "block"`). The deny list holds only the 45 aliases that npm defines by name.
- **Option order, full paths, and an unsplit `sh -c` cannot be blocked by the Codex rules.** We wrote the grounds in "Limits" in `docs/agent-guardrails.md`. A Codex hook could block them, but this PC has no Codex CLI to verify it, so we did not add one.

## Verification

- `node --test scripts/test/agent-guardrails.test.mjs scripts/test/package-install-hook.test.mjs`: 10 of 11 passed; the 1 real Codex CLI verdict test was skipped because the CLI is not installed.
- `UPDATE_SNAPSHOT=1 npm test`: no change to the sync snapshot (the file list is the same).
- `npm run check` passed (193 of 194 tests passed; the 1 real Codex CLI verdict test was skipped because the CLI is not installed).
- We did not check in a real Claude Code session. The #162 hook already blocks the new aliases (`npm u`, `npm ic`, `npm sit`, and so on are in the hook tests), and the tests verify that they are in the deny list.
- We could not run `codex execpolicy check` because there is no Codex CLI. On a PC with the CLI, `agent-guardrails.test.mjs` checks that the 7 new aliases and `upd` and `installTest` are `forbidden`, and that `npm run check`, `npm ls`, `npm audit`, and `npm test` are not caught.
