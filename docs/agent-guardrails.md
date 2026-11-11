# Blocking package installs by agents

Because of npm supply-chain attacks (the Shai-Hulud family), agents do not install, remove, or run packages, except for `npm ci` (#375), which installs exactly what the lockfile says ([dependency policy](dependency-policy.md)). This rule is enforced by tool settings, not only by a sentence in AGENTS.md (#16, #162, #178, #180). The files below are synced to the 9 repos as centrally managed files, and the central repo has the same files.

| Tool | File | Behavior |
|---|---|---|
| Claude Code | `permissions.deny` in `.claude/settings.json` | Refuses matching commands without running them. Both the Bash and PowerShell tools |
| Claude Code | `hooks.PreToolUse` in `.claude/settings.json` → `.claude/hooks/block-package-installs.mjs` | Parses the command and blocks it if it is an install-family command (exit code 2). Covers forms the deny list misses |
| Codex | `.codex/rules/package-installs.rules` | Blocks without asking, using `decision = "forbidden"`. It is a text comparison, so it lists every abbreviation and camelCase form that npm accepts |
| Codex | `PreToolUse` in `.codex/hooks.json` → `.claude/hooks/block-package-installs.mjs` | Parses and blocks the command with the same hook script as Claude Code (exit code 2). Covers forms the rules miss. It runs only after the user trusts it in `/hooks`, and it does not block if the hook fails |

## Blocked commands

- 41 `npm` subcommands and npm 11 aliases (`lib/utils/cmd-list.js`): `install` (`i`, `add`, and the abbreviations and typos `in`, `ins`, `inst`, `insta`, `instal`, `isnt`, `isnta`, `isntal`, `isntall`), `install-test` (`it`), `install-ci-test` (`cit`, `clean-install-test`, `sit`), `update` (`up`, `u`, `upgrade`, `udpate`), `uninstall` (`un`, `remove`, `rm`, `r`, `unlink`), `exec` (`x`), `init` (`create`, `innit`), `rebuild` (`rb`), `dedupe` (`ddp`), `link` (`ln`), and `audit fix`. Both the deny list and the Codex rules block them
- 84 abbreviations (`npm upd`, `npm uni`) and camelCase forms (`npm installTest`) of the commands above: npm also accepts leading parts that do not overlap with other commands, and camelCase names. The Codex rules block these by listing every form (#178), and Claude Code blocks them because the hook parses them
- Whole commands: `npx`, `pnpm`, `pnpx`, `yarn`, `bun`, `bunx`, `corepack`

`npm ci` and its aliases (`clean-install`, `ic`, `install-clean`, `isntall-clean`) are not blocked (#375). They install only the versions pinned in the lockfile, and `ignore-scripts=true` in `.npmrc` stops install scripts from running. However, the hook blocks an `npm ci` that has, in the same command, an option that turns scripts on (`--no-ignore-scripts`, `--ignore-scripts=false`, `--allow-scripts`, `--dangerously-allow-all-scripts`, and their abbreviations) or an environment variable with the same meaning (`npm_config_ignore_scripts=false` and so on). `tools/repos.mjs run`, which runs commands across several repos at once, also refuses `npm ci`.

`npm run`, `npm ls`, `npm view`, `npm outdated`, `npm audit` (report only), and `npm test` are not blocked either. `scripts/test/agent-guardrails.test.mjs` checks that every word in the Codex list becomes an install command under the hook's parsing, and that no abbreviation or camelCase form of a listed word is missing from the list.

## Hook that parses commands (#162)

The deny list compares the start of the command literally, so it misses the forms in "Limitations" below. The hook `.claude/hooks/block-package-installs.mjs` (built-in Node modules only) receives the command before the Bash and PowerShell tools run it and checks it again.

- **What it parses:** quotes, commands joined by `;` `&&` `||` `|` `&` and newlines, commands inside `$( )`, backticks, and `{ }`, and leading environment variables. For full paths and Windows extensions (`C:\…\npm.cmd`, `/c/…/npm.exe`), it looks only at the program name.
- **npm arguments:** It skips options before the subcommand (`--silent`, `--prefix dir`, `-w app`) and decides the subcommand the same way as npm 11's command and alias list (`lib/utils/cmd-list.js`). So it also blocks abbreviations (`npm upd`) and camelCase (`npm installTest`) that the deny list does not have.
- **Wrapped in another command:** It re-parses the command inside `sh` and `bash -c`, `pwsh` and `powershell -Command` and `-EncodedCommand`, `cmd /c`, `eval`, `Invoke-Expression` (`iex`), `Start-Process`, `env` (including `-S`), `sudo`, `timeout`, `nohup`, `xargs`, `cross-env`, `volta run`, and `node …/npm-cli.js`.
- **npx, pnpm, pnpx, yarn, bun, bunx, corepack:** Blocked regardless of arguments. These repos use only npm (`packageManager`).
- **What it does not block:** commit messages, here-documents (`<<EOF`), PowerShell here-strings (`@' '@`), text inside comments, and text passed as an argument to another command such as `grep "npm install"`.
- **It blocks on failure:** The settings include `"onFailure": "block"`. If the script is missing, `node` cannot be found, it does not finish within 10 seconds, or it cannot read the input JSON, the command is not run. Without this field, the command runs as is even when the hook fails (official docs). Claude Code v2.1.295 or later is required.
- **How it runs:** It uses the exec form (`"command": "node"`, `"args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/…"]`), so it does not go through a shell. It runs the same way on Windows with or without Git Bash.

## Using the same hook in Codex (#180)

Decision: **include it.** The Codex rules are a text comparison, so they cannot block the forms in "Limitations" below (`npm --silent install` with the option first, full paths, an unsplit `sh -c`). Codex also supports a `PreToolUse` hook with the same input format, so the Claude Code hook script is used as is. But a Codex hook does not block when it fails (fail-open) and runs only after the user trusts it, so it **supplements the rules and does not replace them**. The rules (`forbidden`) are kept as they are.

- **The input is the same:** Codex passes the shell command (`exec_command`) to the hook as `tool_name: "Bash"` and `tool_input.command` (a string). Even for a PowerShell command on Windows, the name is `Bash`. The script parses Bash and PowerShell syntax together, so the input handling does not need to change. Blocking by exit code 2 and the reason on stderr is also the same.
- **Settings:** `"matcher": "Bash"` and `timeout: 10` in `.codex/hooks.json`. Codex's config reader rejects the whole file if it has an unknown field, so only the fields in the docs (`type`, `command`, `timeout`, `statusMessage`) are used.
- **One command line that runs in two shells:** Codex runs hook commands with `$SHELL -lc` on macOS and Linux and with `%COMSPEC% /C` (cmd) on Windows, and the working folder is the session folder. There is no variable that supplies the project folder (like `${CLAUDE_PROJECT_DIR}`), so the docs recommend finding the repo root with `git rev-parse --show-toplevel`. But when cmd's `for /f` receives the path, a Korean folder name (`문서`) gets garbled, so instead of shell syntax, `node -e` finds the root with `git rev-parse` and calls `main()` of the hook script. This string has none of the characters that sh and cmd change inside quotes (`"` `$` backtick `\` `%` `^`), so one line works in both without `commandWindows` (a test checks this).
- **Trust:** Codex reads the project `.codex/` folder only if it is trusted, and each hook definition runs only after the user reviews and trusts it in `/hooks`. Trust is recorded as a hash of the hook definition, so if the hook in `.codex/hooks.json` changes, it must be trusted again. A change to the contents of the hook script (`.claude/hooks/…`) is not part of the hash.
- **It does not block on failure:** The Codex source (`codex-rs/hooks/src/events/pre_tool_use.rs`) blocks only on exit code 2 (with a reason) and a deny JSON. Other exit codes, timeouts, and execution failures are reported as "failed" and the tool runs as is. There is no setting like Claude Code's `onFailure: "block"`. So if `node` or `git` is missing, the session started outside a git repo, or the user does not trust the hook, the hook blocks nothing and only the rules remain.

## Verification results (2026-10-22)

- Claude Code (central repo): `npm install --dry-run` was refused in both Bash and PowerShell. `FOO=1 npx --version` (environment variable prefixed) was also refused. `npm run` and `npm ls` ran.
- Claude Code 2.1.308 hook (central repo, Windows): in a `claude -p` session, Bash `npm --silent install --help`, `sh -c "npm i --help"`, `"/c/Program Files/Volta/npm.exe" install --help` and PowerShell `npm --silent install --help`, `& "C:\Program Files\Volta\npm.cmd" ci --help` were refused with the hook message. `npm ls --depth=0` and `npm run` in Bash and PowerShell ran. `--help` was added so that no install actually happens during the check.
- Hook decisions are checked by `scripts/test/package-install-hook.test.mjs` with 72 commands to block and 34 commands to allow.
- #180 Codex hook: the same test runs the command in `.codex/hooks.json` the way Codex does (Windows `cmd /C "<command>"`, elsewhere `$SHELL -lc`) from the repo root and a subfolder, and confirms that `npm --silent install` and `& "C:\…\npm.cmd" update` give exit code 2, and `npm ls` and `npm ci` give 0 (before #375 this was checked with `npm.cmd ci`). It passed in both cmd and Git Bash on the central PC (Windows, Korean path). There is no Codex CLI there, so blocking in a real Codex session and the trust procedure were not verified.
- #178 and #180 Codex CLI 0.144.4 `codex execpolicy check` (2026-10-23, central PC): the new aliases `npm u react`, `ic`, `sit`, `install-clean`, `unlink x`, `rb`, `ddp`, `innit` and the abbreviations and camelCase forms `npm upd`, `npm uni x`, `npm installTest` were `forbidden`, and `npm run check`, `npm ls`, `npm audit`, `npm test` did not match a rule. `npm --silent install` with the option first does not match a rule (see the Limitations section), so the hook blocks it. The Codex CLI decision test in `scripts/test/agent-guardrails.test.mjs` passed without being skipped.
- Codex CLI 0.144.4 `codex execpolicy check` (#16): `npm install`, `npm i react`, `npm ci`, `npm audit fix`, `npx shadcn add button`, `yarn`, `corepack enable` were `forbidden`, and `npm run check`, `npm ls`, `npm audit` did not match a rule. This check is rerun by `scripts/test/agent-guardrails.test.mjs` on a PC that has the Codex CLI.

- #375 (2026-11-01): In the records above, `npm ci` being blocked is the result at that time. Since then `npm ci` is allowed, and other install commands such as `npm install` stay blocked.

## Limitations

This blocking is a device against mistakes and violations of instructions, not a security boundary. The limits written in the official docs and the hook's own limits are as follows.

- **Claude Code deny list:** It compares the command text from the start. It does not match when the option is placed before the subcommand like `npm --silent install`, or when run as `sh -c '…'` or with a full path (`C:\…\npm.cmd`) (the hook blocks these forms). Commands joined by `&&`, `;`, `|`, leading environment variables, and wrapping commands such as `timeout` and `nohup` do match. A project's deny takes priority over a personal allow, and cannot be lifted with `.claude/settings.local.json`.
- **Claude Code hook:** It does not fully parse the shell. It cannot see a command held in a variable (`$c = 'npm'; & $c install`), `$( )` inside double quotes, aliases and functions, `find -exec`, calling child_process through `node -e`, or commands inside a script file (`bash x.sh`, `pwsh -File x.ps1`). It checks only the Bash and PowerShell tools. The hook settings are read when the session starts, so restart the session after changing them.
- **Codex:** The rules are read only if the user trusts the project's `.codex/` folder. When a repo is first opened with Codex, it asks whether to trust it. The default sandbox (`workspace-write`) turns the network off, so installs are blocked one more time. The setting that turns the network on (`[sandbox_workspace_write] network_access = true`) is not used.
- **Forms the Codex rules cannot block (#178 survey):** A rule's `pattern` accepts only literal words or word groups, with no regex or wildcards (official docs). So aliases, abbreviations, and camelCase were all blocked by listing them, but the forms below cannot be blocked by rules.
  - An option before the subcommand (`npm --silent install`, `npm -w app install`): the second word is an option, so it does not match a `["npm", …]` pattern. Combinations of options and values are endless and cannot be listed.
  - Full paths (`/usr/bin/npm install`, `C:\…\npm.cmd install`): the official docs only say the command is compared as the argument list that `execvp` receives, and say nothing about reducing a path to the program name. Paths differ per PC and cannot be listed.
  - `bash -lc`, `sh -c`, `zsh -c`: if the script is made only of words joined by `&&` `||` `;` `|`, Codex splits it and applies the rules, so it is blocked (official docs). If it has redirection, `$( )`, environment variables, wildcards, or control statements, Codex does not split it and compares it as one `["bash", "-lc", "<whole script>"]`, so it does not match. `pwsh -Command` and `cmd /c` are not mentioned in the docs.
- **Codex hook (#180):** The hook in `.codex/hooks.json` blocks the forms above ("Using the same hook in Codex"). The official docs treat hooks as "a useful safeguard, not a complete enforcement boundary". If the hook fails or is not trusted, it does not block, so these forms are not blocked again at that point. What the hook can see is the same as the limits of the Claude Code hook (commands held in variables, commands inside script files, and so on). Input put into an already running shell with `write_stdin` does not go through `PreToolUse` again (official docs).
- **Options of `npm ci`:** The Claude Code deny list and the Codex rules compare only words, so they cannot see options that turn scripts on. Only the hook blocks these options and environment variables. A Codex hook runs only after trust and does not block on failure, so in that case they are not blocked. The hook sees only one command at a time, so it also cannot block the case where an environment variable was set in an earlier command or `.npmrc` was edited.
- The prohibition sentences in AGENTS.md are read by both tools only as guidance. Blocking is done by the settings files above.

## Agent permissions for git branch commands (#361)

The commands in "Local branch management (git CLI)" of [std-git-writing](../templates/common/skills/std-git-writing/SKILL.md) are run by the agent without asking. The rules live in centrally managed files, not in per-PC global settings. So in synced repos they behave the same without separate setup on each PC.

| Decision | Commands |
|---|---|
| Run without asking | `git switch`, `git pull --ff-only`, `git branch --delete`, `git fetch origin`, `git fetch --prune origin` |
| Needs approval | `-f`, `-C`, `--force`, `--force-create`, `--discard-changes` of `git switch`; `-D`, `-f`, `--force` of `git branch`; `git reset --hard`, `git clean`, `git stash`, `git rebase` |
| Blocked | Force push (`-f`, `--force`, `--force-with-lease`, `origin +branch`), direct push to main |

- Claude Code puts the Bash and PowerShell tool rules together in `permissions.allow`, `ask`, and `deny` of `.claude/settings.json`. The priority is deny, then ask, then allow. `scripts/test/agent-guardrails.test.mjs` decides sample commands in the same order.
- Codex uses `.codex/rules/git-branch.rules`. It compares only the start of the command, so it cannot tell apart an option attached at the end (`git switch main -f`).
- PowerShell tool rules are case-insensitive (confirmed by an actual run on 2026-10-31). `git branch -d` matches the `-D` approval rule and `git switch -c` matches the `-C` approval rule, so the skill uses `--delete` and `--create`.
- A project's `permissions.allow` applies only in folders the user has trusted. On a new PC or a new clone, open Claude Code interactively once and accept the trust prompt.
- Combined short options (`git switch -fc x`) cannot be told apart by either side's rules. The rules reduce mistakes and are not a security boundary.
- Pushing a work branch, `git add`, and `git commit` are not in these rules. They follow each PC's settings.
- If the global instructions (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`) still have a Fork rule section, the Claude Code `SessionStart` hook (`.claude/hooks/pc-setup-notice.mjs`) tells the user how to fix it at session start (#368). It only reads, and an error does not block the session. It does not appear in clones from before they received the repo's hook, or in Codex sessions.

## Hook for AGENTS.md prohibitions (#450)

A sentence in AGENTS.md holds only while the agent remembers it, and `ask` rules may not stop anything when a session skips permission prompts (#418). So every prohibition that a tool call can show is blocked by the `PreToolUse` hook `.claude/hooks/block-forbidden-commands.mjs`. It exits with code 2 and prints the reason and the right way (for example the `ghp` wrapper). It reuses the command splitter of `block-package-installs.mjs`, so it has the same limits (commands in variables or script files are not seen).

| Prohibition (central and app AGENTS.md, global instructions) | Enforced by |
|---|---|
| Installing, removing, or running packages (`npm install`, `npx`, ...) | Hook `block-package-installs.mjs` + `permissions.deny` + Codex rules |
| Force push; push to `main` or `master` (`git push origin main`, `HEAD:main`, `refs/heads/main`, `--all`, `--mirror`, a bare `git push` while on `main`) | Hook + `permissions.deny` (prefix forms only) + Codex `git-branch.rules` |
| Pushing package tags (`<package>/v<version>`, `--tags`, `--follow-tags`) | Hook |
| Committing secrets: `git add` of `.env` / `.env.*` (not `.env.example`), `*.tfstate`, `*.pem`, `*.p12`, `*.pfx`, `*.dump`, `*private-key*` | Hook. `git add -A` relies on `.gitignore`; `npm run check` runs `secrets:check` in this repo |
| Remote changes through the default `gh` (company account) on Windows: `gh pr/issue/repo/release/workflow/run/label/... <verb>` other than list/view/status/diff/checks/watch/download/checkout/clone; `gh api` with a non-GET method, with fields, or with a GraphQL mutation | Hook. Allowed when `GH_CONFIG_DIR` points to `gh-personal`. Not checked on Linux (devcontainers) |
| `pr merge --delete-branch` (`-d`) through `gh` or the wrapper | Hook |
| Editing the `.claude/skills/` copies with Edit, Write, or NotebookEdit | Hook. Shell copies (`cp`, `npm run skills:sync`) stay allowed because that is how copies are made |
| `git reset --hard`, `git clean`, `git stash`, `git rebase`, `git branch -D`, `git switch -f` | `permissions.ask` is enough: they are sometimes right, and the user decides |
| Pushing directly to downstream or subtree repos (`scripts/push-repositories.ps1`), merging downstream PRs, raising `maxRollout`, doing user steps, writing secrets into docs, PRs, or logs, overwriting user changes | Sentence in AGENTS.md: legitimate uses look the same as the forbidden ones, so a hook cannot tell them apart |

- The hook runs before the permission check. A fresh `claude -p` session that explicitly allowed `git add .env` and `git push origin main` with `--allowedTools` was still blocked by the hook, and nothing was staged (2026-11-11). Claude Code runs `PreToolUse` hooks in every permission mode, `bypassPermissions` included (hooks docs).
- Read-only checks: a bare `git push` asks git for the current branch (`git symbolic-ref`). Nothing else touches the repository.
- **Codex:** the hook keeps the `main()` export and reads `tool_name` `Bash` and `tool_input.command`, so `.codex/hooks.json` can call it the same way as the package hook. That is not done yet, because a changed Codex hook file must be trusted again with `/hooks` in every repo. Codex file edits (`apply_patch`) are not covered.
- If you change what the hook blocks or allows, add examples to `scripts/test/forbidden-command-hook.test.mjs`.

## What CLAUDE.md loads every session (#447)

Claude Code reads `CLAUDE.md` at session start, but it does not follow markdown links such as `[AGENTS.md](AGENTS.md)`. Only lines of the form `@<path>` (imports) pull another file into every session. So the rules in AGENTS.md apply only when CLAUDE.md imports it.

- **Import** a file when every session needs it: the work procedure, prohibited actions, and verification commands. The central `CLAUDE.md` imports `@AGENTS.md`. The app template `templates/app/CLAUDE.md.tmpl` imports `@AGENTS.md` and `@AGENTS.project.md`.
- **Link** a file when only some tasks need it, such as the requirements source `docs/bootstrap-prompt.md`, design docs, and rule docs under `docs/`. An imported file costs context in every session; a linked file costs nothing until it is opened.
- AGENTS.md stays the single source because Codex reads it directly. CLAUDE.md only imports it and adds Claude-specific lines; it does not copy rules.
- Keep the total loaded every session (global `~/.claude/CLAUDE.md` + `CLAUDE.md` + imported files + rules without `paths:`) under 200 lines. Task-specific guides move to skills (#449).
- **Path-specific rules (#448)** live in `.claude/rules/*.md` with a `paths:` list in the front matter. Claude Code loads such a file only after it reads or edits a matching file. Apps get `database.md`, `backend.md`, `frontend.md`, and `docs-and-skills.md` from `templates/app/.claude/rules/`. This repo has its own `sources-and-copies.md` and `sync-and-deploy.md`, which are not synced. AGENTS.md keeps a one-line pointer to each, because Codex does not read `.claude/rules/`.
- `scripts/test/agents.test.mjs` checks that both CLAUDE.md files import AGENTS.md, that the central one does not import anything under `docs/`, that every synced rule file has `paths:`, and the budget: synced CLAUDE.md + AGENTS.md at most 120 lines per app (leaving 80 for `AGENTS.project.md` and the global file), and at most 180 lines in this repo. `AGENTS.project.md` belongs to each project, so it is measured in the change records, not tested here.

## How to change

- The sources are `templates/common/.claude/settings.json.tmpl`, `templates/common/.claude/hooks/block-package-installs.mjs`, `templates/common/.claude/hooks/block-forbidden-commands.mjs` (#450), `templates/common/.codex/rules/package-installs.rules`, `templates/common/.codex/rules/git-branch.rules`, and `templates/common/.codex/hooks.json.tmpl`. If the Codex hook settings change, the user must trust them again with `/hooks` in each repo, so change them only when really needed. The hook script is used by both Claude Code (`node <file>`) and Codex (calling `main()` with `node -e`), so keep the `main` export. The deny list and the Codex rules must block the same commands (a test compares them). Also fix the central repo's `.claude/settings.json`, `.claude/hooks/`, and `.codex/rules/`.
- If npm changes a command or alias, fix together the hook's `NPM_COMMANDS` and `NPM_ALIASES`, the deny list, and the two lists in the Codex rules (aliases, and abbreviations and camelCase). `scripts/test/agent-guardrails.test.mjs` reports missing abbreviation and camelCase forms.
- If you change which commands the hook blocks or allows, add examples to the lists in `scripts/test/package-install-hook.test.mjs`.
- Claude Code settings needed only by one repo go in `.claude/settings.local.json` (not committed). `.claude/settings.json` and `.claude/hooks/` are centrally managed files, so editing them makes standards-check fail.
- Installs that add a new package or change a version need user approval, and the user runs `npm install --ignore-scripts <package>@<version>` directly in a terminal.

## Sources

- Claude Code hooks (PreToolUse input `tool_input.command`, exit code 2, `matcher`, exec form, `onFailure`, default timeout 600 seconds): https://code.claude.com/docs/en/hooks.md
- Claude Code permission rules: https://code.claude.com/docs/en/permissions.md, settings: https://code.claude.com/docs/en/settings.md
- Claude Code memory (`CLAUDE.md` loading, `@path` imports): https://code.claude.com/docs/en/memory.md
- npm command and alias list: npm 11 `lib/utils/cmd-list.js` (the npm included in Node 24.21.0)
- Codex rules (`pattern` is literal words, conditions for splitting `bash -lc`): https://learn.chatgpt.com/docs/agent-configuration/rules, Codex hooks (PreToolUse, `hooks.json`, trust, exit code 2, continue running on failure): https://learn.chatgpt.com/docs/hooks.md, approvals and sandbox: https://learn.chatgpt.com/docs/agent-approvals-security.md, AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- Codex hook implementation (#180, openai/codex `main`, checked 2026-10-22): the hook name `Bash` and input `{"command": cmd}` for shell commands are in `codex-rs/core/src/tools/hook_names.rs` and `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`; the hook config fields (`commandWindows`, `timeout`, `statusMessage`, rejection of unknown fields) are in `codex-rs/config/src/hook_config.rs`; the execution shell (`$SHELL -lc`, `%COMSPEC% /C`) is in `codex-rs/hooks/src/engine/command_runner.rs`; not blocking on failure and exit code handling are in `codex-rs/hooks/src/events/pre_tool_use.rs`; the trust hash and the default timeout of 600 seconds are in `codex-rs/hooks/src/engine/discovery.rs`
