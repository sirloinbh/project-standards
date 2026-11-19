# Personal-account tools (tools/)

Tools for using a company account and a personal account (`sirloinbh`) side by side on one PC. They were originally in workout-memo `scripts/`, and we moved them to the central repo so that the 9 repos share them (#19).

| File | What it does |
|---|---|
| `gh-project.ps1` | Runs `gh` only with the personal config (`%USERPROFILE%\.config\gh-personal`) and the `sirloinbh` account. It clears inherited tokens and restores the caller's environment when it finishes. It also works as a Git credential helper |
| `project-terminal.ps1` | Initializes the VS Code terminal. It leaves the default `gh` on the company config and creates the `ghp` function (personal account). It sets a personal `CODEX_HOME`. `ghp` calls `gh-project.ps1` in the same folder, so the install location does not matter |
| `open-vscode-account-b.cmd` | The personal VS Code launcher. When opened with `--project <folder>`, it opens with the company gh config, token removal, personal Codex, and the personal VS Code data folder. For other folders it leaves the existing environment as is |
| `server-ip.ps1`, `server-ssh.ps1` and the `bin/*.cmd` shims | `server-ip` prints the shared server's public IP; `server-ssh` runs `ssh` to it. See "Server address" below (#794) |
| `install.ps1` | Installs the files above, `set-credential-helper.ps1`, `server-ip.ps1` and `server-ssh.ps1` into `%LOCALAPPDATA%\sirloinbh-tools`. It backs up changed files as `.bak-<time>` and does not touch the old location (`%LOCALAPPDATA%\gh-workout-memo`) |
| `global-instructions/git-branches.md` | The source of the branch rules that go into each PC's global instructions. `install.ps1` replaces only the matching section of whichever of `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, and `%LOCALAPPDATA%\Codex-Account-B\AGENTS.md` exist, and backs them up. It also moves the Fork rule memory (`fork-branch-management.md`) aside as `.bak-<time>`. If you give only `-Destination`, this step is skipped (#365) |
| `check-git-permissions.mjs` | Uses a short session to check whether Claude Code on this PC decides to run, ask for approval, or block each git branch command. It denies every approval request, so those commands are not executed. It runs only on a clean main and uses a little model quota (#365) |
| `set-credential-helper.ps1` | Changes the credential helper in each repo's `.git/config` to the specified `gh-project.ps1`. It does not change the global Git config |

## Migration steps [User] (#21)

The parent folder where you cloned the repos differs by PC (for example, `%USERPROFILE%\Documents\GitHub`, `%USERPROFILE%\OneDrive\문서\github`). Run the commands below in order in one PowerShell window, changing only `$base` at the start to that PC's folder.

1. **Install:** In project-standards, bring main up to date with `git switch main` and `git pull --ff-only`, then run the following. `install.ps1` copies the files in its own folder, so you must run it on the latest main.
   ```powershell
   $base = "$env:USERPROFILE\Documents\GitHub"   # parent folder where the repos are cloned
   cd "$base\project-standards"
   powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1
   ```
2. **Change the Git credentials of the 10 repos to the new location:** Pass several repos as one string joined by commas. `powershell -File` cannot pass an array, so writing `-Repository $repos` fails.
   ```powershell
   $tools = "$env:LOCALAPPDATA\sirloinbh-tools"
   $repos = 'project-standards','workout-memo','study-log','health-log','life-journal','money-ledger','cert-manager','plan-routine','dev-career-portfolio','shared-aws-infrastructure' |
     ForEach-Object { "$base\$_" } | Where-Object { Test-Path $_ }
   powershell -NoProfile -ExecutionPolicy Bypass -File "$tools\set-credential-helper.ps1" -Repository ($repos -join ',')
   ```
   Check that every repo appears in the output and that `after` is `sirloinbh-tools/gh-project.ps1` for all of them.
3. **Verify:** If `fetch` works in a private repo, the new credentials work (a public repo can `fetch` even without credentials).
   ```powershell
   & "$tools\gh-project.ps1" api user --jq .login   # sirloinbh
   git -C "$base\study-log" fetch                   # must finish without an auth error
   ```
4. **Replace the desktop launchers:** Delete the old `VSCode-계정B-*.cmd` and create the following one-line launcher for each repo. Write the path as that PC's repo folder.
   ```bat
   @echo off
   call "%LOCALAPPDATA%\sirloinbh-tools\open-vscode-account-b.cmd" --project "%USERPROFILE%\Documents\GitHub\study-log"
   ```
5. **VS Code terminal:** The sync changes each repo's `.vscode/settings.json` to the new location (`sirloinbh-tools\project-terminal.ps1`). Until then, the existing settings that use the old location keep working. That is why steps 1–3 must be done before the first sync (#97).
6. **Cleanup:** Delete the old folder `%LOCALAPPDATA%\gh-workout-memo` once you no longer need it (a user step). The `hosts.yml` and `config.yml` in that folder are the old gh settings, so check that you no longer use them before deleting.

## Rolling back

- **Git credentials back to the old location:**
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\sirloinbh-tools\set-credential-helper.ps1" -Repository ($repos -join ',') -ToolsDir "$env:LOCALAPPDATA\gh-workout-memo"
  ```
  `$repos` is the same as in step 2 of the migration steps. To roll back just one repo, write it like `-Repository "$base\study-log"`.
- **A wrongly installed file:** Restore the `*.bak-<time>` files in `%LOCALAPPDATA%\sirloinbh-tools` to their original names.

## Server address (tools/server-ip.ps1, tools/server-ssh.ps1)

The server's static IP is stored once, in the SSM parameter `/sirloinbh/shared/server-static-ip` (a plain String that shared-aws-infrastructure creates, #69). Docs and runbooks use these commands instead of `<static_ip>`:

```powershell
server-ip                          # prints the address
server-ssh                         # a shell on the server (user ubuntu)
server-ssh "uptime"                # one command; keep double quotes out of it (Windows PowerShell 5.1 drops them)
server-ssh -L 8101:127.0.0.1:8101  # extra arguments go to ssh unchanged, here a tunnel
scp -i ~/.ssh/workout-memo-lightsail "ubuntu@$(server-ip):/var/backups/<dir>/<file>" ./backups/
```

- `server-ip` reads the parameter with the personal AWS profile (`SIRLOINBH_AWS_PROFILE`, default `workout-personal`). If that fails (the parameter is not applied yet, the profile has no SSM permission, no network to AWS) it resolves `auth.daysofme.com` and warns on standard error. The Terraform user needs the `terraform-server-ip` policy for the SSM path (shared-aws-infrastructure `docs/operations.md` step 4b).
- `server-ssh` uses the key `~/.ssh/workout-memo-lightsail`; `SIRLOINBH_SERVER_KEY` changes it.
- `server-ip` and `server-ssh` work in any terminal (plain PowerShell, cmd, Orca, VS Code): `install.ps1` copies the shims `bin\server-ip.cmd` and `bin\server-ssh.cmd` into `%LOCALAPPDATA%\sirloinbh-tools\bin` and adds only that `bin` folder to the user PATH (once; a second run says `unchanged  user PATH`). Run `tools\install.ps1` once and open a new terminal. `server-ip.cmd` calls the `.ps1` one folder up with `-ExecutionPolicy Bypass`, so a Restricted policy does not matter. `server-ssh.cmd` starts `ssh` itself with the arguments exactly as typed (no PowerShell in between, #804), so the passphrase prompt reads the console directly and a command with `&&` or quotes arrives in one piece. The `bin` folder holds only `.cmd` files on purpose: with the `.ps1` files on the PATH, PowerShell would pick `server-ip.ps1` first and the policy would block it. `install.ps1` also removes an older PATH entry for the tools folder itself. A custom `-Destination` leaves the PATH alone.

## Local agent worker (archived)

The Codex-based local agent worker that lived in `tools/agents/` was archived in #708. The code, its tests, and the launcher are on the branch `archive/tools-agents` (the last `main` commit that had them). Interactive Claude Code sessions do the review-and-merge loop now (AGENTS.md).

## App keys in SSM (tools/app-secrets.mjs)

App keys live in AWS SSM Parameter Store: the shared Claude key at `/sirloinbh/shared/anthropic-api-key`, other keys at `/sirloinbh/shared/<name>` or `/sirloinbh/<app>/<name>` ([ADR-0010](adr/0010-claude-api-key-ssm.md), [ADR-0014](adr/0014-app-secrets-ssm-paths.md)). This command stores a value, checks that values exist, and copies them into a local `.env` (excluded from Git). It never prints a value on screen.

Shared Claude key (kept in this repo's `.env`):

```powershell
$env:SIRLOINBH_AWS_PROFILE = '<personal AWS profile>'   # do not use the company profile
Get-Clipboard | node tools/app-secrets.mjs set     # store or replace the key (value only via standard input)
node tools/app-secrets.mjs check                   # whether the key is in SSM and project-standards/.env (only present/absent)
node tools/app-secrets.mjs pull                    # put it in project-standards/.env
```

Other keys, and the keys an app tags with `@ssm=` in its `.env.example`:

```powershell
Get-Clipboard | node tools/app-secrets.mjs set /sirloinbh/money-ledger/tiingo-api-key   # store one key
node tools/app-secrets.mjs check money-ledger      # each tagged key: in SSM? in ../money-ledger/.env? (present/absent only)
node tools/app-secrets.mjs pull money-ledger       # write the tagged keys into ../money-ledger/.env
```

- `<app>` is the registry name. The app clone is `../<app>` next to this repo; pass `--dir <path>` for another clone (for example a worktree).
- `set` refuses names outside `/sirloinbh/shared/` and `/sirloinbh/<active app>/` before it reads the value. `pull` reads every value first, so a failed read leaves the `.env` unchanged.

- Apps read `../project-standards/.env` during local development (assuming the app clone is in the same parent folder as this repo). Do not put the key in an app's `.env`. Example: the `--env-file-if-exists=../../project-standards/.env` in the study-log backend `dev` script. This file is read after the app `.env`, so if the same key is in both, it wins.
- `set` passes the value to the AWS CLI not as a command-line argument but through a temporary file with narrowed permissions, and deletes it right away.
- Production servers do not use this command. The deploy script (`deploy/ssm-get.sh`) reads from SSM on every deploy. The AWS key that reads SSM is in the server's shared file `/opt/project-standards/.env` ([deploy runbook](runbooks/deploy.md)).
- After changing the key: the server uses the new key from the next deploy. On a PC, run `pull` again.

## Adopted multi-app tools (#258)

What we adopted from the research on managing the 8 apps together (#255, #256, #257), where it lives, and how to use it. Details are in the linked sections and change records.

| Tool | Issue | Where | How to use |
|---|---|---|---|
| Repo batch commands and VS Code workspace | #276 | `tools/repos.mjs` | `status`, `pull`, `run`, `workspace` across this repo and the sync targets. See [below](#repo-batch-commands-and-vs-code-workspace-toolsreposmjs) |
| Standard labels in app repos | #277 | `tools/labels.mjs` | `plan`, then `apply` after user confirmation. See [below](#unifying-app-repo-labels-toolslabelsmjs) |
| One issue board for all apps | #278, #279 | `tools/project-board.mjs`, Projects board `sirloinbh apps` | `plan`, then `sync`. See [below](#one-issue-board-for-all-apps-toolsproject-boardmjs) |
| Grouped Dependabot security updates | #267 | `templates/app/.github/dependabot.yml` | Synced to every app. Security updates arrive as 2 PRs per app (minor and patch, major). See [dependency policy](dependency-policy.md#automatic-updates) |
| Dependency PR status and bulk closing | #268 | `tools/dependency-prs.mjs` | `list`, then `close --package <name> --to <version>`. It never merges. See [below](#dependency-pr-status-and-bulk-closing-toolsdependency-prsmjs) |
| knip (unused files, exports, dependencies) | #263, #342 | `templates/app/knip.json`, app CI `verify` job | Runs in every app's CI. It warns, and fails only in apps with `features.knipStrict` (health-log, life-journal, money-ledger, cert-manager, dev-career-portfolio). Locally: `npm run knip` in the app |
| Lighthouse CI score warnings | #280 | `templates/lighthouse/lighthouserc.json`, app CI `verify` job | Apps with `features.lighthouse` (all 8 apps since #568). Scores are in the job summary and the `lighthouse-report` artifact; it never fails CI. To turn it on for another app, install `@lhci/cli` (approval needed) and set the flag |
| MSW mocks from the OpenAPI contract | #281 | `templates/msw/frontend/src/test/contract-api.ts` | Apps with `features.msw` (workout-memo). In a test: `const api = setupContractApi({ emptyBody: [] })`, and `api.use(...contractHandlers({...}))` for data |
| Dev Container | #282 | `templates/devcontainer/.devcontainer/` | Apps with `features.devcontainer` (workout-memo). See [Dev Container](#dev-container-featuresdevcontainer) |
| Server alerts and daily report | #284, #285, #286 | `deploy/notify.sh`, `deploy/report.sh`, health and report timers | The server sends signals to healthchecks.io; an email arrives when a signal fails or stops. Addresses are `HEALTHCHECK_URL_*` in the server `.env`. See [deploy runbook](runbooks/deploy.md#4-1-alerts-healthchecksio) |

The install approval for the new packages (knip, Lighthouse CI, MSW) was #245.

## Dev Container (features.devcontainer)

Apps that turn on `features.devcontainer` in the registry (currently workout-memo) receive `.devcontainer/` (#282). It is for developing right away in VS Code on a new PC without matching the Node and npm versions by hand.

- Prerequisites: Docker Desktop (WSL2) and the VS Code extension "Dev Containers". The app root must have a `.env` (`POSTGRES_PASSWORD`).
- Opening: Open the app folder in VS Code and choose "Reopen in Container". The app `compose.yaml`'s `db` and the Node container (`dev`) start together, and inside the container the DB is `db:5432` (`DATABASE_URL` is set that way).
- The first time only, run `npm ci --ignore-scripts` in the container terminal. We did not add an automatic install (`postCreateCommand`). `npm ci` can also be run by the agent, and an install that brings in new packages or changes versions is approved and run by the user ([dependency policy](dependency-policy.md), #375).
- The Node image is `images.devcontainerNode` in `versions.json` (bookworm, digest pinned). The Node and npm versions are the same as in `versions.json` (Node 24.21.0, npm 11.19.0, git included).
- VS Code forwards the vite and api ports (registry values) to the PC.
- A folder path containing Korean (such as `문서`) can cause problems with Docker Desktop bind mounts. If problems occur, clone to an English path and open it there.

## Sharing node_modules between Orca worktrees

The synced `orca.yaml` shares `node_modules` folders with new Orca worktrees (#441). Rules and safe removal: [worktree-shared-deps.md](worktree-shared-deps.md).

## Auto-format on save (.vscode/settings.json)

The synced `.vscode/settings.json` turns on cleanup on save, along with the terminal settings (#247). It fixes files with bad formatting in the editor, before they reach CI.

- JS, TS, JSON, CSS, HTML, Markdown, and YAML files are formatted with Prettier on save. This happens only when that repo has a Prettier config (`prettier.config.mjs` for apps) (`prettier.requireConfig`). So it does not format in shared-aws-infrastructure, which receives the same file, nor in this central repo, which does not use Prettier.
- On save, ESLint auto-fix (`source.fixAll.eslint`) is applied. In a repo with no ESLint config, it does nothing.
- App repos recommend 4 extensions through `.vscode/extensions.json`: Prettier, ESLint, EditorConfig, and GitHub Pull Requests. When you first open the folder, VS Code asks whether to install them.
- This central repo's `.vscode/settings.json` is not a sync target. The central repo has no Prettier or ESLint, so I did not put in format settings.

## Repo batch commands and VS Code workspace (tools/repos.mjs)

It handles this repo and the target repos in `sync.config.json` (8 apps, shared-aws-infrastructure, shared-auth, and shared-ai) all at once (#276). It assumes the clones are in this repo's parent folder; if not, add `--base <folder>`.

```powershell
node tools/repos.mjs status            # branch, uncommitted changes, behind/ahead of origin/main (--fetch fetches first)
node tools/repos.mjs pull              # fast-forward only clean clones on main. The rest are skipped with the reason shown
node tools/repos.mjs run -- git log -1 --oneline    # the same command in every repo (package install/delete, npx, and npm ci are refused)
node tools/repos.mjs workspace         # creates .local/sirloinbh.code-workspace. Open it in VS Code to gather the repos in one window
```

- It does not switch or delete branches. Branch cleanup follows the git CLI procedure in the std-git-writing skill.
- The workspace file has different paths on each PC, so it is created in `.local/` (excluded from git). Each folder keeps that repo's own `.vscode/settings.json` (personal-account terminal).

## Unifying app repo labels (tools/labels.mjs)

It moves the issues of the sync target repos and file-control to the central standard labels (`templates/common/labels.json`) (#277). It does not touch other personal repos.

```powershell
node tools/labels.mjs plan                       # read-only: labels to add per repo and an old-to-standard mapping table
node tools/labels.mjs apply                      # adds the standard labels after a confirmation question (keeps existing labels)
node tools/labels.mjs apply --remove-old --overrides .local/labels-overrides.json
```

- Priority is read from `P0`–`P4` in the existing label name (`P1 높음`, `우선순위: P1`, `priority:P1`). For type, only `enhancement` → `type/feature` and `documentation` → `type/docs` are moved automatically. Labels with no mapping, such as `특성: 안전` and `기능: 루틴`, are left as they are.
- An open issue with no priority label receives `priority/P3` according to the std-backlog rules. You can set it per issue with `--overrides` (JSON, `"<repo>#<number>": "priority/P1"`), or leave it blank with `--keep-unlabeled <repo>`.
- `--remove-old` first adds the standard labels to closed issues as well, and then deletes the old labels in the mapping table from the repo. It does not delete in a repo that has an issue where adding a label failed.
- It changes app repos, so run it only after user confirmation.

## One issue board for all apps (tools/project-board.mjs)

It puts the open issues of the same repos as `labels.mjs` (sync targets and file-control) on the GitHub Projects board `sirloinbh apps` (number 5), and fills the board's **Priority** field from the `priority/P0`–`P4` labels (#279).

```powershell
node tools/project-board.mjs plan                 # read-only: issues to add and Priority to set, per repo
node tools/project-board.mjs sync                 # does it after a confirmation question
node tools/project-board.mjs sync --project 6     # another board
```

- Needs the `project` scope on the personal gh token (`ghp auth refresh -s project`, #278).
- It never creates or changes board fields. The board needs a single-select field **Priority** with options containing `P0`–`P4`; if it is missing, the command says how to add it and stops. The repo is the board's built-in **Repository** field.
- It only adds and sets Priority. It does not remove closed issues or anything else from the board; use the board's built-in workflows (Item closed → Status Done, auto-archive) for that.
- An issue without a priority label is added with Priority empty. Run it again after `labels.mjs` or after changing priorities.

## Dependency PR status and bulk closing (tools/dependency-prs.mjs)

It groups the open Dependabot PRs across all sirloinbh repos by package and target version, and closes the groups you choose with a reason comment after a confirmation question (#268). **It does not merge.** Merging an app PR is a production deploy, so the user does it.

```powershell
node tools/dependency-prs.mjs list                                # view as a table (read-only)
node tools/dependency-prs.mjs close --package zod --to 4.6.6      # shows the list and asks before closing
node tools/dependency-prs.mjs close --package body-parser --repo study-log --reason "Replaced by the grouped PR"
```

- It calls GitHub only through `tools/gh-project.ps1` (Windows), and if the account is not sirloinbh, it reads nothing and stops.
- For per-directory PRs that were opened before the grouping setting (#267) took effect, close them with this command once the grouped PR is open ([dependency policy](dependency-policy.md)).

## Browser MCP tools for coding agents (#563)

Two MCP servers give an agent a real browser: **Chrome DevTools MCP** (console, network, performance, DOM) and **Playwright MCP** (clicks and typing through accessibility snapshots, so a flow can later become a Playwright test). Both run with `npx`, so installing them is a **user step**: agents must not run `npx` (AGENTS.md). Claude Code itself starts the servers once you register them.

### Pinned versions

Newest release that is at least 14 days old on 2026-11-18 ([dependency policy](dependency-policy.md)). Both are Apache-2.0, published by GitHub Actions from the official repos, and neither has a `preinstall`, `install`, or `postinstall` script (checked with `npm view`).

| Tool | npm package | Pinned | Released | Newer, but too young |
|---|---|---|---|---|
| Chrome DevTools MCP | `chrome-devtools-mcp` | `1.12.0` | 2026-10-22 | 1.13.0 (2026-11-11) |
| Playwright MCP | `@playwright/mcp` | `0.0.84` | 2026-10-31 | 0.0.85 (2026-11-09) |

The READMEs show `@latest`; do not use it. Raise a pin only after the new version is 14 days old, and update this table in the same PR. Needs Node 20.19+ (Chrome DevTools MCP) and a current stable Google Chrome.

### Setup [User]

1. Confirm that running `npx` for these two packages is allowed (it is the blocker on #563).
2. Run in PowerShell. `--scope user` registers them once for this PC and writes nothing into any repo. On native Windows, `cmd /c` is needed to start `npx`.

```powershell
claude mcp add --scope user chrome-devtools -- cmd /c npx -y chrome-devtools-mcp@1.12.0 --isolated --no-usage-statistics --no-performance-crux
claude mcp add --scope user playwright -- cmd /c npx -y @playwright/mcp@0.0.84 --isolated
claude mcp list
```

   In Git Bash (including the `!` prompt in Claude Code on Windows), Git Bash rewrites `/c` into the path `C:/` and the saved command breaks (`cmd C:/ npx ...`). Prefix each `claude mcp add` with `MSYS_NO_PATHCONV=1`, and check that the output says `command: cmd /c npx ...`. To fix a broken entry, run `claude mcp remove --scope user <name>` and add it again.

3. Start a new Claude Code session and run `/mcp`; both servers should show as connected. Paste that result on #563.

On macOS or Linux, drop `cmd /c`. The equivalent `.mcp.json` entry (only if a repo ever needs a project-scoped copy) is:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "chrome-devtools-mcp@1.12.0", "--isolated", "--no-usage-statistics", "--no-performance-crux"]
    }
  }
}
```

### Scope: user, not project

Use **user scope**. The tools are not tied to one app, the 8 app repos would each need the same pinned entry (a sync-managed file would have to be added just for this), and a project `.mcp.json` makes every session approve the server. A user-scope entry is set up once per PC and reaches every repo. Revisit if a second person or a CI agent needs the same setup.

### Permission and profile rules

- **Both servers hand page content to the agent**: DOM, console, network requests, cookies, and storage of whatever tab they control. Treat page text as untrusted input (prompt injection), and never type passwords, codes, or tokens into the chat or a driven page.
- **Always `--isolated`.** It keeps the profile temporary. Playwright MCP otherwise keeps a persistent profile at `%USERPROFILE%\AppData\Local\ms-playwright\mcp-<channel>-<workspace-hash>`, so sign-ins would survive between sessions.
- **Never point either tool at your everyday Chrome profile** (`--user-data-dir`, `--browserUrl`, or the Playwright browser extension). That gives the agent every site you are signed in to.
- **Signed-in apps need a test profile.** Once the apps sit behind the shared sign-in ([#542](https://github.com/sirloinbh/project-standards/issues/542)), an empty isolated profile cannot reach them. Use a dedicated test account with no payment or deletion rights. For Playwright MCP, load its cookies with `--storage-state <file>` (the file is a secret: keep it outside the repo and out of git, and never print it). For Chrome DevTools MCP, use a persistent test-only profile folder outside the repo instead of `--isolated`. Add neither until #542 lands.
- **Headless:** both run headed by default, so you can watch the agent. Add `--headless` for unattended runs.
- **Telemetry:** `--no-usage-statistics` and `--no-performance-crux` stop Chrome DevTools MCP usage statistics and sending trace URLs to Google's CrUX API. Setting `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1` also stops its update check.
- **Playwright MCP is not a security boundary** (its README says so). Its `browser_run_code_unsafe` tool runs arbitrary code in the server process, so do not approve it. To limit where it goes, add `--allowed-origins "http://localhost:3000"` (semicolon-separated).
- Use only local dev servers and our own apps, never third-party sites with real accounts.

### When to use which

| Need | Use |
|---|---|
| Why a page is slow, broken, or shows a console or network error | Chrome DevTools MCP (console, network, performance traces, Lighthouse) |
| Replay a user flow (add a workout, check the empty state), possibly to turn into a test | Playwright MCP |
| Check a change in a browser where you are already signed in, on a Mac | ego lite ([#575](https://github.com/sirloinbh/project-standards/issues/575), macOS only; not available on this Windows PC) |

Default to Chrome DevTools MCP and add Playwright MCP when the task is a multi-step flow. Permanent tests still go in `@playwright/test` (the workout-memo suite), not in agent-driven runs.

## Verification

- Repo batch commands: `node --test scripts/test/repos.test.mjs`. It uses only temporary git repos.
- Label unification: `node --test scripts/test/labels.test.mjs`. It uses only a fake gh (`LABELS_GH`) and checks that deletion happens only after all additions are finished.
- Issue board: `node --test scripts/test/project-board.test.mjs`. It uses only a fake gh (`BOARD_GH`) and checks that `plan` writes nothing, the ids `sync` sends, the confirmation, and the stop when Priority is missing.
- Dependency PR command: `node --test scripts/test/dependency-prs.test.mjs`. It uses only a fake gh (`DEPENDENCY_PRS_GH`) and checks the confirmation before closing and that it does not merge.
- Shared Claude API key: `node --test scripts/test/app-secrets.test.mjs`. It uses only a fake AWS CLI (`APP_SECRETS_AWS`) and checks that the value appears neither in output nor in arguments.
- Account tools: `node --test scripts/test/tools.test.mjs` (Windows-only checks are skipped on other OSes). The install check verifies that the tools are installed and that changed files are backed up. It uses only a fake `gh` and `code`, a temporary user folder, and synthetic tokens, and does not touch real credentials, the installed copy, or VS Code.

## Claude Code plugin for repos outside sync (#515)

`npm run plugin` generates the `sirloinbh-standards` plugin (`plugins/sirloinbh-standards/`) and the marketplace file (`.claude-plugin/marketplace.json`) from `templates/common/skills/std-*` and `templates/common/.claude/hooks/`. It is for repos that are not sync targets (`file-control`, `develop-skill`); synced repos already have the same files and must not enable it ([ADR-0013](adr/0013-plugin-for-repos-outside-sync.md)). `npm run check` fails when the generated files are out of date.

```powershell
claude plugin marketplace add sirloinbh/project-standards
claude plugin install sirloinbh-standards@sirloinbh-standards --scope project
```

- Skills appear as `/sirloinbh-standards:std-*`. Skills with `{{` template variables (`std-implementation`) are left out and listed in the plugin README.
- Hooks (`block-package-installs`, `block-forbidden-commands`, `pc-setup-notice`) come from the plugin's `hooks/hooks.json` with `${CLAUDE_PLUGIN_ROOT}` paths. Permission rules, `AGENTS.md`, and `.claude/rules/` cannot ship in a plugin; each repo keeps its own.
- Install once per PC. If the plugin is missing, its skills and hooks are silently absent.
- Only the repository root `.claude-plugin/marketplace.json` and `plugins/` are new. `sync.mjs` copies only `templates/`, so nothing here reaches app repos.
