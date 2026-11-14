# Personal-account tools (tools/)

Tools for using a company account and a personal account (`sirloinbh`) side by side on one PC. They were originally in workout-memo `scripts/`, and we moved them to the central repo so that the 9 repos share them (#19).

| File | What it does |
|---|---|
| `gh-project.ps1` | Runs `gh` only with the personal config (`%USERPROFILE%\.config\gh-personal`) and the `sirloinbh` account. It clears inherited tokens and restores the caller's environment when it finishes. It also works as a Git credential helper |
| `project-terminal.ps1` | Initializes the VS Code terminal. It leaves the default `gh` on the company config and creates the `ghp` function (personal account). It sets a personal `CODEX_HOME`. `ghp` calls `gh-project.ps1` in the same folder, so the install location does not matter |
| `open-vscode-account-b.cmd` | The personal VS Code launcher. When opened with `--project <folder>`, it opens with the company gh config, token removal, personal Codex, and the personal VS Code data folder. For other folders it leaves the existing environment as is |
| `install.ps1` | Installs the files above, `set-credential-helper.ps1`, and the agent worker (`agents.ps1`, `agents/*.mjs`, `registry/projects.json`, `versions.json`) into `%LOCALAPPDATA%\sirloinbh-tools`. It backs up changed files as `.bak-<time>` and does not touch the old location (`%LOCALAPPDATA%\gh-workout-memo`) |
| `global-instructions/git-branches.md` | The source of the branch rules that go into each PC's global instructions. `install.ps1` replaces only the matching section of whichever of `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, and `%LOCALAPPDATA%\Codex-Account-B\AGENTS.md` exist, and backs them up. It also moves the Fork rule memory (`fork-branch-management.md`) aside as `.bak-<time>`. If you give only `-Destination`, this step is skipped (#365) |
| `check-git-permissions.mjs` | Uses a short session to check whether Claude Code on this PC decides to run, ask for approval, or block each git branch command. It denies every approval request, so those commands are not executed. It runs only on a clean main and uses a little model quota (#365) |
| `set-credential-helper.ps1` | Changes the credential helper in each repo's `.git/config` to the specified `gh-project.ps1`. It does not change the global Git config |
| `agents.ps1`, `agents/` | The launcher and worker of the local agent worker. See [Local agent worker](#local-agent-worker-toolsagents) below |

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
6. **Cleanup:** Only after you confirm that every repo works with the new location, delete the old folder `%LOCALAPPDATA%\gh-workout-memo`. The `hosts.yml` and `config.yml` in that folder are the old gh settings, so check that you no longer use them before deleting.

## Rolling back

- **Git credentials back to the old location:**
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\sirloinbh-tools\set-credential-helper.ps1" -Repository ($repos -join ',') -ToolsDir "$env:LOCALAPPDATA\gh-workout-memo"
  ```
  `$repos` is the same as in step 2 of the migration steps. To roll back just one repo, write it like `-Repository "$base\study-log"`.
- **A wrongly installed file:** Restore the `*.bak-<time>` files in `%LOCALAPPDATA%\sirloinbh-tools` to their original names. Worker files are backed up under `agents\`, and the registry under `registry\`.
- **Agent worker back to the workout-memo copy:** Stop the installed worker with `agents.ps1 -Root <repo> stop` and use `scripts\agents.ps1` inside the repo (until it is deleted in #167). The queue (`.local/agent-workflow/`) is in the same place, so it carries on as is.
- **Remove the agent worker:** After stopping the worker, delete `agents.ps1`, `agents\`, `registry\`, and `versions.json` in the install folder. The repo's `.local/agent-workflow/` is uncommitted working state, so delete it separately when you no longer need it.

## Local agent worker (tools/agents)

A local worker that takes one issue and carries it through writing tests → implementation → independent review → host check → PR → CI check. It was moved from workout-memo `scripts/agents/` (#165). It is not copied into downstream repos; one copy installed on the PC handles several repos (#166). The workout-memo switchover happens in #167.

### Install [User]

The `install.ps1` in step 1 of the [migration steps](#migration-steps-user-21) installs the worker as well.

```text
%LOCALAPPDATA%\sirloinbh-tools\
  agents.ps1              launcher
  agents\*.mjs            worker
  registry\projects.json  list of repos the worker can be used with
  versions.json           for Node version comparison
```

When `tools/agents/` or the registry changes, run `install.ps1` again after `git pull`. It backs up and overwrites only the changed files. Worker files deleted from the source remain in the install folder, so delete them yourself.

### Running

```powershell
$agents = "$env:LOCALAPPDATA\sirloinbh-tools\agents.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <repo folder> doctor
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <repo folder> enqueue -Issue 42 -Slug csv-export
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <repo folder> start
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <repo folder> status
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <repo folder> stop
```

| Command | What it does |
|---|---|
| `status` (default) | Shows that repo's queue and worker state as JSON |
| `doctor` | Checks the account, repo registration, `.agents.json`, Codex, and npm |
| `start` | If `doctor` passes, starts the worker in a hidden window. The log is `<repo>\.local\agent-workflow\worker.*.log` |
| `stop` | Asks the worker to stop after the current step finishes |
| `smoke -Role <role>` | Checks the connection with a small read-only model request |
| `enqueue -Issue <number>` | Puts the issue in the queue and creates a worktree. Options: `-TaskKind`, `-ReviewRole`, `-TestComplexity`, `-RequireDatabase`, `-RequireBrowser`, `-BranchType feat\|fix\|docs\|chore`, `-Slug` |
| `configure -Issue <number>` | Changes the routing options of a waiting or stopped task |
| `diagnose`, `retry`, `accept-requirements`, `cancel`, `handoff-tests` | Run for the task given by `-Issue <number>` |

- **Target repo:** `-Root` (the current folder if omitted). If it is not the top level of a Git repo, it creates nothing and stops. The queue, locks, worktrees, and logs live in that repo's `.local/agent-workflow/`, so repos do not get mixed, and you can start a separate worker per repo.
- **Node:** If the target repo has `.local\node-v<node in versions.json>-win-x64\node.exe`, it uses that; otherwise it uses `node.exe` on the PATH. If the version differs from `versions.json`, it only warns (on standard error) and continues.
- **Codex:** If `CODEX_HOME` is empty, it uses `%LOCALAPPDATA%\Codex-Account-B`, the same as `project-terminal.ps1`.
- **Without the launcher:** `node <tools folder>\agents\cli.mjs --root <repo folder> <command>` works the same way (`enqueue 42 --slug csv-export`, `work --once`, and so on). When developing in this repo, use `node tools\agents\cli.mjs ...`.
- **Repo name:** Read from the `origin` URL. Only repos owned by `sirloinbh` and listed in `repos` of `registry/projects.json` are allowed. The registry is looked up at `../../registry/` relative to `tools/agents/` (this repo) or `../registry/` (the installed copy).
- **Branch and change record:** The std-git-writing format `<type>/<issue-number>-<english-summary>` and `docs/changes/<issue-number>-<english-summary>.md`. Choose `type` with `--branch-type feat|fix|docs|chore`. If you do not give one, it is `docs` when `--task-kind documentation`, and `feat` otherwise. Use `fix` for bug fixes and `chore` for settings, cleanup, and migrations (user decision, 2026-10-22). Give the English summary with `--slug`; if there is none, it uses the first 5 English words of the title, and if there are none, `agent-task`. Tasks registered before #165 keep their stored branch and `docs/changes/<number>-agent-task.md` as they are.
- **GitHub calls:** On Windows, it uses `gh-project.ps1` in the install folder (`tools/agents/../gh-project.ps1`).
- **Per-PC settings:** `codexExecutable`, `npmCli`, and `browserExecutable` in `<repo>/.local/agent-workflow/config.json`. Not committed.

### Repo settings file `.agents.json`

Commit it at the root of a repo that uses the worker. If it is missing, everything uses defaults. If there is an unknown key or a malformed value, the worker stops without running any command.

| Key | Default | Meaning |
|---|---|---|
| `checkScript` | `"check"` | The name of the npm script to run as the host check (`npm run <name>`). Shell commands are not accepted |
| `database.tables` | none | The tables and columns the DB precheck verifies, `{ "<table>": ["<column>", ...] }`. If absent, the schema precheck is skipped. A task that needs a DB still requires a dedicated `TEST_DATABASE_URL` in that case |
| `browser.checkArgs` | none | Arguments for the browser verification command. The executable is the per-PC `browserExecutable`. If absent, it uses `browserCheckArgs` in the per-PC `config.json` as before |
| `autoMerge` | `true` | After CI passes, the worker merges the PR. If `false`, it changes the PR to ready and the user merges it |

**Auto-merge is on by default (user decision, 2026-10-22).** For a repo where a person must confirm the merge, such as one where a merge to main is a production deploy, turn it off by putting `"autoMerge": false` in `.agents.json`.

#### Auto-merge per repo

Keep the default `true`, and turn it off with `false` only for repos where auto-merge is not allowed (user decision, 2026-10-23, #184). The rule "ask the user first about downstream repo PRs" in the central `AGENTS.md` applies to interactive agents, and PRs opened by the worker follow this table. The app `AGENTS.md` files state the same exception.

| Repo | `autoMerge` | Reason |
|---|---|---|
| `workout-memo` | `true` (default, not written in the file) | The user allowed auto-merge in #128 |
| `study-log`, `health-log`, `life-journal`, `money-ledger`, `cert-manager`, `plan-routine`, `dev-career-portfolio` | `false` | A merge to main is a production deploy, and there is no decision allowing auto-merge |
| `project-standards`, `shared-aws-infrastructure` | Not applicable | They are not in the registry `repos`, so the worker does not run. `project-standards` is merged by the agent, as the central `AGENTS.md` says |

- **If the file is missing, it auto-merges.** So for a repo with `false`, include `.agents.json` (at least `{"autoMerge": false}`) in the PR that introduces the worker, and before introducing it, check `autoMerge false` in the `doctor` output of `agents.ps1 -Root <repo> doctor`.
- **Do not distribute it by sync.** `.agents.json` holds values that differ per repo, such as `checkScript` and `database.tables`, and the sync's JSON field management (`fields`) does not create a missing file, so it cannot solve the "no file means auto-merge" problem. The source of truth for per-repo values is this table, not the registry.
- To change a value in the table, record the user's decision in an issue and fix this table and that repo's `.agents.json` together.

**Example for a repo without a DB precheck.** It only renames the check script and turns off auto-merge because a merge to main is a deploy. If everything is the default, you do not need to create the file.

```json
{
  "checkScript": "verify",
  "autoMerge": false
}
```

**Example for a repo with a DB precheck (workout-memo).** It specifies only the tables and uses the default for auto-merge.

```json
{
  "database": {
    "tables": {
      "brands": ["id", "name"],
      "machines": ["id", "brand_id", "name", "base_weight", "notes"],
      "workouts": ["id", "date", "title", "notes", "created_at"],
      "sets": ["id", "workout_id", "exercise", "machine_id", "weight", "reps", "position", "notes"],
      "goals": ["id", "exercise", "target_weight", "target_reps", "start_date", "deadline"]
    }
  }
}
```

## Shared Claude API key (tools/app-secrets.mjs)

The source of truth for the Claude API key is a single AWS SSM Parameter Store entry, `/sirloinbh/anthropic-api-key` ([ADR-0010](adr/0010-claude-api-key-ssm.md)). This command puts the key into SSM, checks that it exists, and puts it into one place, this repo's local `.env` (excluded from Git). It never prints the value on screen.

```powershell
$env:SIRLOINBH_AWS_PROFILE = '<personal AWS profile>'   # do not use the company profile
Get-Clipboard | node tools/app-secrets.mjs set     # store or replace the key (value only via standard input)
node tools/app-secrets.mjs check                   # whether the key is in SSM and project-standards/.env (only present/absent)
node tools/app-secrets.mjs pull                    # put it in project-standards/.env
```

- Apps read `../project-standards/.env` during local development (assuming the app clone is in the same parent folder as this repo). Do not put the key in an app's `.env`. Example: the `--env-file-if-exists=../../project-standards/.env` in the study-log backend `dev` script. This file is read after the app `.env`, so if the same key is in both, it wins.
- `set` passes the value to the AWS CLI not as a command-line argument but through a temporary file with narrowed permissions, and deletes it right away.
- Production servers do not use this command. The deploy script (`deploy/ssm-get.sh`) reads from SSM on every deploy. The AWS key that reads SSM is in the server's shared file `/opt/project-standards/.env` ([deploy runbook](runbooks/deploy.md)).
- After changing the key: the server uses the new key from the next deploy. On a PC, run `pull` again.

## Dev Container (features.devcontainer)

Apps that turn on `features.devcontainer` in the registry (currently workout-memo) receive `.devcontainer/` (#282). It is for developing right away in VS Code on a new PC without matching the Node and npm versions by hand.

- Prerequisites: Docker Desktop (WSL2) and the VS Code extension "Dev Containers". The app root must have a `.env` (`POSTGRES_PASSWORD`).
- Opening: Open the app folder in VS Code and choose "Reopen in Container". The app `compose.yaml`'s `db` and the Node container (`dev`) start together, and inside the container the DB is `db:5432` (`DATABASE_URL` is set that way).
- The first time only, run `npm ci --ignore-scripts` in the container terminal. We did not add an automatic install (`postCreateCommand`). `npm ci` can also be run by the agent, and an install that brings in new packages or changes versions is approved and run by the user ([dependency policy](dependency-policy.md), #375).
- The Node image is `images.devcontainerNode` in `versions.json` (bookworm, digest pinned). The Node and npm versions are the same as in `versions.json` (Node 24.21.0, npm 11.19.0, git included).
- VS Code forwards the vite and api ports (registry values) to the PC.
- A folder path containing Korean (such as `문서`) can cause problems with Docker Desktop bind mounts. If problems occur, clone to an English path and open it there.

## Auto-format on save (.vscode/settings.json)

The synced `.vscode/settings.json` turns on cleanup on save, along with the terminal settings (#247). It fixes files with bad formatting in the editor, before they reach CI.

- JS, TS, JSON, CSS, HTML, Markdown, and YAML files are formatted with Prettier on save. This happens only when that repo has a Prettier config (`prettier.config.mjs` for apps) (`prettier.requireConfig`). So it does not format in shared-aws-infrastructure, which receives the same file, nor in this central repo, which does not use Prettier.
- On save, ESLint auto-fix (`source.fixAll.eslint`) is applied. In a repo with no ESLint config, it does nothing.
- App repos recommend 4 extensions through `.vscode/extensions.json`: Prettier, ESLint, EditorConfig, and GitHub Pull Requests. When you first open the folder, VS Code asks whether to install them.
- This central repo's `.vscode/settings.json` is not a sync target. The central repo has no Prettier or ESLint, so I did not put in format settings.

## Repo batch commands and VS Code workspace (tools/repos.mjs)

It handles this repo and the target repos in `sync.config.json` (8 apps and shared-aws-infrastructure) all at once (#276). It assumes the clones are in this repo's parent folder; if not, add `--base <folder>`.

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

## Dependency PR status and bulk closing (tools/dependency-prs.mjs)

It groups the open Dependabot PRs across all sirloinbh repos by package and target version, and closes the groups you choose with a reason comment after a confirmation question (#268). **It does not merge.** Merging an app PR is a production deploy, so the user does it.

```powershell
node tools/dependency-prs.mjs list                                # view as a table (read-only)
node tools/dependency-prs.mjs close --package zod --to 4.6.6      # shows the list and asks before closing
node tools/dependency-prs.mjs close --package body-parser --repo study-log --reason "Replaced by the grouped PR"
```

- It calls GitHub only through `tools/gh-project.ps1` (Windows), and if the account is not sirloinbh, it reads nothing and stops.
- For per-directory PRs that were opened before the grouping setting (#267) took effect, close them with this command once the grouped PR is open ([dependency policy](dependency-policy.md)).

## Verification

- Agent worker: `npm run test:agents`. It is also included in `npm test` (and therefore `npm run check`). On Windows, `.github/workflows/agents.yml` runs it one more time. It uses only fake git, gh, npm, Codex, and temporary repos. The launcher checks (`agents.ps1 -Root <folder> status` installed in a temporary folder shows only each one's own queue in two fake repos, passing of `-Root`, `-BranchType`, and `-Slug`, and 2 PowerShell→Node boundaries) run only on Windows.
- Repo batch commands: `node --test scripts/test/repos.test.mjs`. It uses only temporary git repos.
- Label unification: `node --test scripts/test/labels.test.mjs`. It uses only a fake gh (`LABELS_GH`) and checks that deletion happens only after all additions are finished.
- Dependency PR command: `node --test scripts/test/dependency-prs.test.mjs`. It uses only a fake gh (`DEPENDENCY_PRS_GH`) and checks the confirmation before closing and that it does not merge.
- Shared Claude API key: `node --test scripts/test/app-secrets.test.mjs`. It uses only a fake AWS CLI (`APP_SECRETS_AWS`) and checks that the value appears neither in output nor in arguments.
- Account tools: `node --test scripts/test/tools.test.mjs` (Windows-only checks are skipped on other OSes). The install check also verifies that the worker, registry, and `versions.json` are installed and that changed worker files are backed up. It uses only a fake `gh` and `code`, a temporary user folder, and synthetic tokens, and does not touch real credentials, the installed copy, or VS Code.

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
