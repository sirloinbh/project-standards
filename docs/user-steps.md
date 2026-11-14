# Steps only you can do (user step list)

These are the steps an agent cannot do for you (secrets, remote account settings, files that exist only on your PC). When you finish an item, tell me in chat with the issue number. **Never paste secrets such as private keys or tokens into chat or documents.**

| Order | Task | Time | Issue | Status (checked 2026-10-23) |
|---|---|---|---|---|
| 0 | Change the local `.env` ports | 5 min | (follow-up to #95) | Not checked (local file) |
| 1 | Install the personal-account tools to the new location | 5 min | #21 | Not done: `%LOCALAPPDATA%\sirloinbh-tools` does not exist |
| 2 | Update shared-aws-infrastructure and prepare the Terraform state | Done | #92 | Done (2026-10-24): state rebuilt by import, plan shows "No changes" |
| 3 | Create the GitHub App and set up Actions sharing | 10 min | #86 | Not done: no `SYNC_APP_ID` variable or `SYNC_APP_PRIVATE_KEY` secret |
| 4 | First publish of the shared packages and access permissions | 10 min | #88 | Not done: no package tags or Releases |
| 5 | Align repo settings (Dependabot, merge method, workout-memo security) | 10 min | #22 | Not done: Dependabot alerts are off |
| 6 | (If you already did 3) Add Issues write permission to the GitHub App | 3 min | #40 | Skipped because 3 is not done yet |
| 7 | Trust the Codex hooks and check blocking | 3 min | #180 | Not done (Codex CLI 0.144.4 installed; rule decisions recorded in PR #185) |
| 8 | Check the work PC (Claude Code version, agent runner) | 3 min | #183 | Partly: Claude Code 2.1.309 confirmed. The runner comes after 1 |
| 9 | Turn on secret scanning, push protection, and CodeQL for 11 repos, and add Code scanning read permission to the App | 15 min | #261 | Not done (added 2026-10-27) |
| 10 | Issue a Claude API key and set a spending limit, put it in SSM, and put the server read key in place | 15 min | #266 | Not done (added 2026-10-27) |
| 11 | Create a healthchecks.io account and one check per app, and put the ping URLs in the server `.env` | 20 min | #286 | Not done (added 2026-10-27) |
| 12 | Fix the lockfiles of the 8 sync PRs (shared ESLint config 1.1.0) | 15 min | #328 | Done (2026-10-29) |
| 13 | Merge 3 app PRs (skill cleanup) | 5 min | #313 | Done (2026-10-29, merged by the agent) |
| 14 | Approve installing the ESLint and Prettier plugins and more | 10 min | #245 | Not done |
| 15 | Clean up merged local branches | 5 min | — | Not done (added 2026-10-28) |
| 16 | Apply the git CLI branch rules on the other work PC | 5 min | #361 | `OneDrive\문서\github` PC done (2026-10-31). `Documents\GitHub` PC not done |

**The recommended order for what remains is 1 → 3 → 4.** 2 is done. Once 1–4 are finished, you can start the first sync (#97: workout-memo, `maxRollout` 1). 0, 5, and 7 can be done at any time, in any order. Do 8 right after 1.

When you finish a step, tell me something like "#21 done". What the agent does next:

| Finished step | What the agent does next |
|---|---|
| 1 (#21) | Guides you through the check in 8 (#183) |
| 2 (#92) | Done: #93 cleanup of the infrastructure repo, #94 removal of `infrastructure/` from workout-memo. Next is the #36 deployment template |
| 4 (#88) | A PR that puts package version 1.0.0 into `versions.json` |
| All of 1–4 | #97 first sync PR for workout-memo (the 4-3 server token is needed before merging) |

## 0. Change the local `.env` ports

Ports were reassigned with a slot scheme ([project table](projects.md)). In each repo's local `.env`, change the port in `DATABASE_URL` and `PORT` to the values below.

| Repo | `PORT` (API) | `DATABASE_URL` port (DB) | Web address |
|---|---|---|---|
| workout-memo | 3101 | 15401 | http://localhost:8101 |
| study-log | 3102 | 15402 | http://localhost:8102 |
| health-log | 3103 | 15403 | http://localhost:8103 |
| life-journal | 3104 | 15404 | http://localhost:8104 |
| money-ledger | 3105 | 15405 | http://localhost:8105 |
| cert-manager | 3106 | 15406 | http://localhost:8106 |
| plan-routine | 3107 | 15407 | http://localhost:8107 |
| dev-career-portfolio | 3108 | 15408 | http://localhost:8108 |

Example for workout-memo: `DATABASE_URL=postgres://workout:<password>@localhost:15401/workout`, `PORT=3101`.

Then run `docker compose up -d` in each repo, and the DB container reopens on the new port. The data volume is unchanged.

## 1. Install the personal-account tools to the new location (#21)

The procedure is steps 1–4 of "Migration steps" in [tools.md](tools.md). The order is: install (`tools\install.ps1`), change the Git credential path in 10 repos (`set-credential-helper.ps1`), verify, and replace the desktop launchers. You must do this **before the first sync (#97)**, because the sync changes the VS Code terminal settings to the new location.

## 2. Update shared-aws-infrastructure and prepare the Terraform state (#92, done)

**Finished on 2026-10-24.** The PC that did the first apply was no longer accessible, so the state was lost, and I rebuilt it by import on the current work PC. The results:

- I fast-forwarded the shared-aws-infrastructure main to the latest `infrastructure/` from workout-memo (`684542a`).
- I upgraded the AWS provider to v6.68.0 (sirloinbh/shared-aws-infrastructure#2). v5 cannot import the static IP.
- After importing 4 resources and creating 3 new ones, `terraform plan` shows "No changes". The static IP address is unchanged.
- Cleanup of the infrastructure source (#93) and removal of `infrastructure/` from workout-memo (#94) are also done.

### When working on the infrastructure from another PC

The source of truth for the procedure is `docs/operations.md` in shared-aws-infrastructure. Follow the chapter below for your situation.

| Situation | `docs/operations.md` |
|---|---|
| Preparing a new PC: install Terraform and the AWS CLI, a Terraform-only IAM user with a minimal-permission policy (do not create root keys), an SSH key, `terraform.tfvars` | Chapter 1 |
| Backing up the state and moving it to another PC | Chapter 3 |
| Rebuilding the state by import after losing it | Chapter 4 |
| Adding the new PC's SSH key to the server (briefly allow browser SSH) | Chapter 5 |

Points to know when choosing the order:

1. **First check where the state is.** If it exists, copy the backed-up file to the new PC and confirm that plan shows "No changes". If it does not, go to the import procedure in chapter 4. If you apply without state, resources get duplicated.
2. **Two resources cannot be imported.** Delete the SSH key pair in the console and create it again, and the firewall rules are overwritten with the same values by apply. So right after the import, a plan of "4 to import, 3 to add, 0 to change, 0 to destroy" is normal. If you see a replacement (`-/+`) or a deletion, do not apply.
3. **If you upgraded the provider version, merge the PR first and then apply.** Applying saves the state in the new format, and you cannot go back.
4. **Check the allowed IPs.** If the new PC's public IP is not in `allowed_cidrs`, SSH and web access are blocked.

### When pasting commands in PowerShell 5.1

These are problems we actually hit while working on #92.

- **Paste commands as a single line.** If a line breaks (the `>>` prompt appears), a newline ends up inside the quotes. The `ssh-keygen -C` comment became two lines, and a `git config` value was stored as two entries.
- **An empty string argument (`""`) is not passed to the executable.** If you run `git config --add credential.https://github.com.helper ""` in PowerShell, the empty helper line is not stored. Set up credentials with `set-credential-helper.ps1` in [tools.md](tools.md), and check the result with `git config --local --get-all credential.https://github.com.helper` (the first line must be empty).
- **There is no `<` input redirection.** To pass a file's contents to a command, use the web page or `Get-Content -Raw`.
- **Write files as UTF-8 without BOM.** Use `[IO.File]::WriteAllText(<path>, <content>, (New-Object Text.UTF8Encoding $false))` instead of `Set-Content` or `Out-File`.
- **`ssh-keygen` does not create the `.ssh` folder.** First run `New-Item -ItemType Directory -Force "$HOME\.ssh"`.
- **The first time the AWS CLI runs, it asks whether to install skills for AI agents and an MCP server.** Answer `n` if you do not need them. If you answer `y`, 24 skills and an MCP server with an unpinned version (`@latest`) are registered for all projects.

## 3. Create the GitHub App and set up Actions sharing (#86)

**Why it is needed:** For the central repo to open sync PRs in 9 repos, it needs a dedicated App with narrow permissions. The sharing setting is also needed so that downstream repos can call the central common CI. The detailed procedure and how to rotate the key are in [github-app.md](github-app.md).

### 3-1. Create the App

With GitHub logged in as `sirloinbh`, go to Settings → Developer settings → GitHub Apps → New GitHub App.

| Field | Value |
|---|---|
| GitHub App name | `project-standards-sync` |
| Homepage URL | `https://github.com/sirloinbh/project-standards` |
| Webhook | Uncheck Active |
| Repository permissions | Contents: Read and write / Pull requests: Read and write / Workflows: Read and write / Issues: Read and write / Administration: Read-only / Secrets: Read-only / Variables: Read-only (everything else is No access; Metadata is automatic) |
| Where can this App be installed? | Only on this account |

After you click Create, write down the **App ID** (a number) shown on the page.

### 3-2. Create and register the private key

At the bottom of the App page, click Generate a private key, and a `.pem` file is downloaded.

Register it in project-standards → Settings → Secrets and variables → Actions.

- **Secrets** tab → New repository secret: the name is `SYNC_APP_PRIVATE_KEY`, and for the value, open the `.pem` file in Notepad and paste everything from `-----BEGIN` to `END-----`.
- **Variables** tab → New repository variable: the name is `SYNC_APP_ID`, and the value is the App ID number.

Delete the `.pem` file right after registering it. If you need it again, just create a new one. PowerShell has no `<` input redirection, so use the web page instead of the command line.

### 3-3. Install

App page → Install App → sirloinbh Install → under Only select repositories, choose these 10: project-standards, workout-memo, study-log, health-log, life-journal, money-ledger, cert-manager, plan-routine, dev-career-portfolio, shared-aws-infrastructure.

### 3-4. Allow sharing of the common CI

In project-standards → Settings → Actions → General → Access, choose "Accessible from repositories owned by the user 'sirloinbh'" and Save.

### 3-5. Verify

Go to project-standards → Actions → sync → Run workflow, or run `ghp workflow run sync.yml -R sirloinbh/project-standards`. It succeeded if the log shows "설치 토큰 발급 확인. maxRollout 0이라 동기화할 대상이 없습니다." (log message: installation token issued; with `maxRollout` 0 there is nothing to sync). Right now `maxRollout` is 0, so no PR is opened in any repo. If it fails, check for a typo in the App ID, whether the whole private key went in, and the installation scope.

## 4. First publish of the shared packages and access permissions (#88)

**Why it is needed:** For downstream repos to install the 4 shared config packages, the packages must be published first, and each repo needs permission to read them. We decided that publishing happens only by pushing a tag, so you have to do it yourself.

### 4-1. Push 4 tags (starts the publish)

```powershell
cd <project-standards folder>
git fetch origin
git tag eslint-config/v1.0.0 origin/main
git tag prettier-config/v1.0.0 origin/main
git tag tsconfig/v1.0.0 origin/main
git tag design-tokens/v1.0.0 origin/main
git push origin eslint-config/v1.0.0
git push origin prettier-config/v1.0.0
git push origin tsconfig/v1.0.0
git push origin design-tokens/v1.0.0
```

**Push tags one at a time.** GitHub does not run workflows when a single push has more than 3 tags. On 2026-10-24 I pushed 4 at once and publish did not run (#198). If you already pushed them all at once, delete the remote tags with `git push origin --delete <tags...>` and push them again one by one.

The tags go on `origin/main` so that your local main is not changed. Check in Actions that all 4 publish runs succeed, and that 4 Releases appear in Releases. The deployment run link in each Release body is how the sync verifies where a package came from.

### 4-2. Package access permissions

In your GitHub profile → Packages, for each of the 4 packages, go to Package settings → Manage Actions access → Add repository, add the 8 app repos, and leave the Role as Read. This lets each app's CI install the packages.

### 4-3. Lightsail server token (only needed before merging the first workout-memo sync PR)

1. Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)
   - Name: `lightsail-read-packages`
   - Expiration: for example, 1 year
   - Scope: `read:packages` only
2. Set it on the server.
   ```powershell
   ssh -i ~/.ssh/workout-memo-lightsail ubuntu@<static_ip>
   sudo nano /opt/workout-memo/.env    # add NODE_AUTH_TOKEN=<the issued token> at the bottom and save
   ```
3. Write the expiry date in your calendar. Keep the token only in the server `.env`.

Tell me when 4-1 and 4-2 are done. The agent will make the PR that puts package version 1.0.0 into `versions.json`.

## 5. Align repo settings (#22)

In all 9 repos, Dependabot vulnerability alerts and security updates are off, and in workout-memo (public), branch protection and secret scanning are also off (checked 2026-10-22). The criteria, reasons, and commands are in "How to align" in [repo-settings.md](repo-settings.md). Set workout-memo's branch protection after the first sync (#97) is merged.

## 6. Add Issues write permission to the GitHub App (#40)

**Why it is needed:** For the sync to create or fix the std-backlog labels (20 priority and characteristic labels) in the 9 repos, the App needs Issues write permission. If you have not done 3 yet, it is already in the 3-1 table, so skip this step.

1. GitHub → Settings → Developer settings → GitHub Apps → `project-standards-sync` → Permissions & events.
2. Change **Issues** under Repository permissions to "Read and write" and Save changes.
3. In Settings → Applications → Installed GitHub Apps → `project-standards-sync`, **Accept** the new permission request. It does not take effect until you Accept.
4. It succeeded if the next `sync` run log shows a `라벨 생성 n, 갱신 n, 그대로 n` line for each repo (log line: labels created n, updated n, unchanged n). If `라벨 실패 — ... 403` (label failure) appears, check 3 again.

The sync only creates or fixes labels and never deletes them. Labels that exist only in a single repo and GitHub's default labels (such as `bug`) are left alone.

## 7. Trust the Codex hooks and check blocking (#180)

**Why it is needed:** Codex runs a project's hooks (`.codex/hooks.json`) only after you trust them in `/hooks`. If you do not trust them, only the rules (`.codex/rules/`) remain, and the rules cannot block a form with the option placed first, such as `npm --silent install` ([agent-guardrails.md](agent-guardrails.md)). It needs an interactive session, so you have to do it yourself.

1. Open Codex in the project-standards folder. If it asks whether to trust the project's `.codex/` folder, trust it.
2. Type `/hooks`, review the "패키지 설치 명령인지 확인" hook (hook name: check whether it is a package install command), and trust it.
3. Ask Codex to run `npm --silent install --help`. It succeeded if you see "패키지 설치·삭제·실행 명령이라 막았습니다" (hook message: blocked because it is a package install, delete, or run command).
4. In the same way, check that `npm ls` does run.

Leave the result as a comment on #180 or tell me, and I will close the issue. If a hook in `.codex/hooks.json` changes, you must trust it again.

## 8. Check the work PC (#183)

Do this right after finishing 1. If you have several work PCs, do it on each PC.

```powershell
claude --version    # must be 2.1.295 or later (update if lower)
Test-Path "$env:LOCALAPPDATA\sirloinbh-tools\agents.ps1"    # True
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\sirloinbh-tools\agents.ps1" -Root <project-standards folder> status
```

Then, in a newly started Claude Code session, check that `npm --silent install --help` is blocked and `npm ls` runs. If Claude Code is older than 2.1.295, the command runs as-is when the blocking hook fails. Leave the result (PC name, version) as a comment on #183.

## 16. Apply the git CLI branch rules on the other work PC (#361)

The global instructions are a file outside the repo, so they must be run once per PC. The permission rules inside the repo come along with `git pull`. Run this in that PC's project-standards folder.

If the Fork rule is still in the global instructions, this notice appears when you start a Claude Code session (#368). The notice is raised by a hook in the repo, so it appears only after that PC's repo has received the hook. Once you finish applying, it no longer appears.

```powershell
git switch main
git pull --ff-only
powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1
node tools\check-git-permissions.mjs
```

It succeeded if the last line shows `All decisions match.`. Leave the output as a comment on #361, or tell Claude Code on that PC "apply #361 on the other PC". On a PC where you are using Claude Code in this folder for the first time, open it interactively once first and accept the folder trust.

## 9. Turn on repo security settings and add App permission (#261)

**Why it is needed:** All 11 repos are public, so secret scanning, push protection, and CodeQL are free to use. The compliance report now treats all three as required for every repo (#260). Only you have permission to change the settings.

1. Add the sync App permission: GitHub → Settings → Developer settings → GitHub Apps → `project-standards-sync` → Permissions & events → change **Code scanning alerts** under Repository permissions to "Read-only" and save. In Settings → Applications → Installed GitHub Apps, **Accept** the new permission.
2. In each of the 11 repos (`project-standards`, `shared-aws-infrastructure`, the 8 apps, and `file-control`), turn on secret scanning, push protection, and the CodeQL default setup. The commands are in "How to align" in [repo-settings.md](repo-settings.md).
3. After turning them on, leave the **number** of code scanning and secret scanning alerts that first appear as a comment on #261 (do not write the contents). You are done when all three items show ✓ in the next compliance report.

## 10. Put the Claude API key in one place in SSM (#266)

**Why it is needed:** The source of truth for the Claude API key is one place in AWS SSM, and the server and PCs fetch it from there ([ADR-0010](adr/0010-claude-api-key-ssm.md)). Issuing the key, billing, and creating AWS keys can only be done with your own accounts. **Never paste the key value into chat or documents.**

1. shared-aws-infrastructure PR #9 (backup bucket and server IAM users) was merged and applied (2026-10-29). Merge the follow-up PR that renames the users to be shared by all apps (`sirloinbh-apps-*`) and apply again. Follow "Check before merging" in that PR.
2. Use the $200 monthly API credit included with your Claude subscription ([guide](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers)). It is not used for interactive Claude Code, and unused credit does not carry over to the next month.
   1. The credit is linked to the Console organization `Quantified ESG` (linked 2026-10-29). Do not link it again. To move it to another organization, you must contact support.
   2. In the upper left of the Console, check that the organization is `Quantified ESG`, and check that the credit appears under Promotional credits in Billing. Do not turn on a payment method or auto-reload. When the credit runs out, calls stop until the next grant date, and nothing is billed on top of the subscription fee. If the organization already has another payment method or auto-reload, usage may move to it after the credit runs out, so check that first.
   3. Create one workspace shared by all apps, `byunghk-tool`, and set a monthly spending limit on it. Create one API key in that workspace (for example, `byunghk-tool-shared`). All apps fetch this single key from SSM (ADR-0010).
   4. Do not use the Console's Workload Identity Federation guide. This is because an IAM role cannot be attached to Lightsail.
3. Give your personal AWS identity write access to `/sirloinbh/*` in SSM (once; it was denied before, ADR-0014). In the AWS console → IAM → Users → the user of your personal AWS profile → Add permissions → Create inline policy → JSON, paste this, and name it `sirloinbh-ssm-write`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["ssm:PutParameter", "ssm:GetParameter", "ssm:DeleteParameter"],
       "Resource": "arn:aws:ssm:ap-northeast-2:*:parameter/sirloinbh/*"
     }]
   }
   ```
4. With the key copied, run this in the project-standards folder (it stores the key at `/sirloinbh/shared/anthropic-api-key`):
   ```powershell
   $env:SIRLOINBH_AWS_PROFILE = '<personal AWS profile>'
   Get-Clipboard | node tools/app-secrets.mjs set
   node tools/app-secrets.mjs pull      # puts it in the one place project-standards/.env
   node tools/app-secrets.mjs check     # success if every line shows "present"
   ```
   Apps read `project-standards/.env` during local development. Do not put the key in an app's `.env`.
5. In the AWS console, create access keys for the 2 server IAM users (use case "Application running outside AWS") and put them in one place, the server's shared file `/opt/project-standards/.env`. Do not put them in each app. The command that creates the file for the first time is in "Shared file" in the [deploy runbook](runbooks/deploy.md).

   | IAM user | Keys to put in the shared file |
   |---|---|
   | `sirloinbh-apps-secrets-reader` | `SECRETS_AWS_ACCESS_KEY_ID`, `SECRETS_AWS_SECRET_ACCESS_KEY` |
   | `sirloinbh-apps-backup-uploader` | `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_S3_BUCKET` (= `terraform output backup_bucket`) |

   From the next deploy, apps that use the Claude API read the key from SSM, and from the next dump, every app's backup is uploaded to S3. After that, you may delete the `ANTHROPIC_API_KEY` line from the study-log server `.env`.
6. If there is an old key, revoke it in the Console. When you finish, leave a comment "done" on #266 (do not write the value).

## 11. Turn on healthchecks.io alerts (#286)

**Why it is needed:** Even if an app stops or a backup or automatic deployment fails, it is only recorded in the server log for now. The server sends pings to healthchecks.io, and you get an email when they stop or fail (#284). The account and email settings can only be done with your own account. **Do not paste the ping URLs into chat or documents** (they contain a secret UUID).

1. Sign up at https://healthchecks.io (20 checks free). Confirm the email address that will receive alerts.
2. Create a check for each app. Name it like `<app>-health`, and set the period and grace time according to the "Alerts" table in the app deploy runbook (`docs/runbooks/deploy.md`). 8 apps × 5 checks exceeds the free limit, so start with the app that is already running (workout-memo).
3. In the server's `/opt/<app>/.env`, put the URL for each check, like `HEALTHCHECK_URL_HEALTH=...`.
4. Install the health timer with `sudo bash /opt/<app>/deploy/install-backup.sh` (after the sync PR is applied).
5. Stop it briefly with `docker compose stop web`, see whether an email arrives within 10–15 minutes, and restore it with `docker compose start web`. Leave the result as a comment on #286 (do not write the URLs).

## 12. Fix the lockfiles of the 8 sync PRs (#328)

> **Done (2026-10-29).** All 8 PRs were merged with an added lockfile commit. What changed in all 8 was the same 4 lines of the `@sirloinbh/eslint-config` entry. This PC's Node (24.22.1) differs from the app's pinned version (24.21.0) and hit `engine-strict`, so for this lockfile-only run I added `--engine-strict=false`. Use the procedure below again the next time you raise a shared package version.

**Why it is needed:** We published shared ESLint config 1.1.0 (tag `eslint-config/v1.1.0`, 2026-10-28), and the sync PRs of the 8 apps changed `@sirloinbh/eslint-config` in the root `package.json` to 1.1.0. The lockfile is unchanged, so CI fails at `npm ci` (`lock file's @sirloinbh/eslint-config@1.0.0 does not satisfy ...@1.1.0`). The agent cannot run install commands (blocking hook, [agent-guardrails.md](agent-guardrails.md)), so you run the one install line. Install approval was given on 2026-10-28.

| App | Sync PR | Branch |
|---|---|---|
| workout-memo | sirloinbh/workout-memo#177 | `chore/standards-sync-5435065` |
| study-log | sirloinbh/study-log#116 | `chore/standards-sync-29607cf` |
| plan-routine | sirloinbh/plan-routine#33 | `chore/standards-sync-29607cf` |
| health-log | sirloinbh/health-log#19 | `chore/standards-sync-29607cf` |
| life-journal | sirloinbh/life-journal#16 | `chore/standards-sync-29607cf` |
| money-ledger | sirloinbh/money-ledger#17 | `chore/standards-sync-29607cf` |
| english-study | sirloinbh/english-study#16 | `chore/standards-sync-29607cf` |
| dev-career-portfolio | sirloinbh/dev-career-portfolio#16 | `chore/standards-sync-29607cf` |

Branch names may change at the next sync. Check again in the PR before running. The `chore/standards-sync-5b4fe8a` remote branch in each repo is an old branch with no open PR.

1. **Add the token scope (once).** A local install needs permission to read GitHub Packages. The 2026-10-28 run lacked this permission, so all 8 stopped with `401 Unauthorized` (no files changed). In a PowerShell terminal in VS Code:
   ```powershell
   ghp auth refresh -h github.com -s read:packages
   ```
2. **Rewrite the lockfile.** Run this on the sync PR branch of each app. It does not create `node_modules` and does not run install scripts.
   ```powershell
   $env:NODE_AUTH_TOKEN = (ghp auth token)
   npm install --package-lock-only --ignore-scripts --engine-strict=false --no-audit --no-fund
   Remove-Item Env:NODE_AUTH_TOKEN
   ```
   If you tell the agent "prepare 12", it fetches the 8 branches into working folders (worktrees) and writes a script that runs them all at once. It does not touch your local app checkouts.
3. **Tell the agent "ran 12".** The agent continues from there.
   - For each app, it checks that the lockfile change is only the `@sirloinbh/eslint-config` entry (version, URL, and integrity value). If another package changed, it stops for that app and tells you.
   - It commits and pushes, and merges the sync PRs once all CI passes (starting with workout-memo). You delegated these 8 merges on 2026-10-28.
   - The `frontend/` and `backend/` lockfiles do not change (this package is only in the root `devDependencies`). Double-check with `npm run lockfiles:sync` (#303).

The only newly enabled rules are 2: `type`-only writes and a ban on default exports, and the 8 apps have 0 violations (#308).

## 13. Merge 3 app PRs (#313)

These are PRs that fix stale lines in the app skills. Only the skill documents change.

- [x] sirloinbh/study-log#119: tool and token descriptions in `study-log-testing` and `study-log-foundation`
- [x] sirloinbh/plan-routine#35: the same two lines
- [x] sirloinbh/workout-memo#176: delete `workout-communication`. I merged the workout-memo sync PR (#177) from 12 first

Merged 2026-10-29. In all three PRs, the table alignment in `docs/changes/standards-313-skill-cleanup.md` failed `format:check`, so I added a commit that aligns it with Prettier and then merged.

## 14. Install approval (#245)

This is the install approval for 4 ESLint and Prettier plugins (#244), knip (#263), Lighthouse CI (#280), and MSW (#281). The package list and verification results are in #245 and `docs/research/lint-rules.md`. Please check the socket.dev score before approving. Once you approve, #246 (passing the plugins to the app template) starts.

## 15. Clean up merged local branches

Delete the local branches that are already merged. First bring main up to date with `git switch main` and `git pull --ff-only`, then run `git branch -d <branch>` for each branch. You can also leave it to the agent.

- project-standards: `docs/240-research-decisions`, `feat/303-workspace-lockfiles`, `feat/304-shared-dependency-versions`, `feat/308-eslint-config-1-1`, `feat/309-backend-http-standard`, `feat/310-frontend-api-standard`, `feat/311-confirm-dialog-notice`, `docs/307-zod4-research`, `docs/312-api-ui-code-rules`, `feat/313-std-communication`, `fix/326-zod-unbounded-arrays`, `chore/328-eslint-config-1-1-rollout`, `docs/328-pending-user-steps`, `chore/323-gitignore-tool-outputs`, `docs/248-domain-research`, `docs/328-user-steps-done` (after the PR for this document is merged)
- study-log: `fix/121-content-order-limit`
- The 8 apps: steps 12 and 13 used only branchless working folders, so no new local branches were created. If `git branch` shows `chore/standards-sync-*` or `docs/313-skill-cleanup`, they are merged and safe to delete
