# Creating, installing, and rotating the key of the GitHub App

This is the procedure for the GitHub App `project-standards-sync`, which opens the sync PRs. The reasoning behind the decision is in [ADR-0002](adr/0002-github-app-for-sync.md). Steps marked **[User]** are done by the user directly on the GitHub pages. The agent does not do these steps for you.

## What to create at a glance

| Item | Value |
|---|---|
| App name | `project-standards-sync` |
| Owner | Personal account `sirloinbh` |
| Installation scope | Only the 10 repos below (do not choose All repositories) |
| Private key storage | Central repo Actions secret `SYNC_APP_PRIVATE_KEY` |
| App ID storage | Central repo Actions variable `SYNC_APP_ID` |

Repos to install on: `project-standards`, `workout-memo`, `study-log`, `health-log`, `life-journal`, `money-ledger`, `cert-manager`, `plan-routine`, `dev-career-portfolio`, `shared-aws-infrastructure`

### Repository permissions

| Permission | Level | Where it is used |
|---|---|---|
| Contents | Read and write | Commit to the sync branch |
| Pull requests | Read and write | Create and update sync PRs |
| Workflows | Read and write | Sync `.github/workflows/ci.yml`. Without this permission, GitHub rejects the push |
| Metadata | Read-only | Default (required) |
| Administration | Read-only | Check branch protection and merge settings in the compliance report (#22) |
| Secrets | Read-only | Check only secret **names** in the compliance report. It cannot read the values (#22) |
| Variables | Read-only | Check variable names in the compliance report (#22) |
| Code scanning alerts | Read-only | Check in the compliance report that the CodeQL default setup is on (#260). It does not read the alert contents |
| Issues | Read and write | Create and update issue labels (`templates/common/labels.json`). It does not delete labels (#40) |

Leave all other permissions at "No access". If you already created the App, add the Issues permission and the Code scanning alerts permission as described in "When changing permissions" below.

Do not grant the Actions permission. When the sync checks the publish record of a shared package (the Release and the `publish.yml` run), it reads only the central repo with the `GITHUB_TOKEN` of `sync.yml` (`actions: read`), not the App token (#205).

## 1. Create the App [User]

1. Check that you are logged in to GitHub as the personal account `sirloinbh`.
2. Settings → Developer settings → GitHub Apps → **New GitHub App**.
3. Enter:
   - GitHub App name: `project-standards-sync`
   - Homepage URL: `https://github.com/sirloinbh/project-standards`
   - Webhook: **Uncheck Active** (this App does not receive events)
   - Repository permissions: as in the table above
   - Where can this GitHub App be installed?: **Only on this account**
4. Click **Create GitHub App**.
5. Write down the **App ID** on the page that appears (a number, not a secret).

## 2. Create and register the private key [User]

1. In the App settings page, at the bottom, Private keys → **Generate a private key**. A `.pem` file is downloaded.
2. In the central repo `sirloinbh/project-standards` → Settings → Secrets and variables → Actions:
   - **Secrets** tab → New repository secret: the name is `SYNC_APP_PRIVATE_KEY`, and the value is the entire contents of the `.pem` file (from the `-----BEGIN` line to the `END` line)
   - **Variables** tab → New repository variable: the name is `SYNC_APP_ID`, and the value is the App ID from step 1
3. **Delete** the downloaded `.pem` file. Do not paste it anywhere: not in the repo, documents, chat, or logs. If you need it again, create a new key.

## 3. Install [User]

1. App settings page → Install App → **Install** next to `sirloinbh`.
2. Choose **Only select repositories** and select the 10 repos above.
3. When you create a new project repo, add that repo here (see "Adding a new project" in the README).

## 4. Allow downstream repos to use the central CI [User]

Because the central repo is private, downstream repos need the following setting to call the central reusable workflow.

1. `sirloinbh/project-standards` → Settings → Actions → General.
2. Under **Access**, select "Accessible from repositories owned by the user 'sirloinbh'" and Save.

## 5. Verify operation

1. **[User]** Central repo Actions tab → the `sync` workflow → **Run workflow** (manual run). If `maxRollout` in `sync.config.json` is 0, no PR is opened, and it only issues a token and computes the plan.
2. In the run log, check that the "설치 토큰 발급" step (the "issue installation token" step) succeeded. The token value must not appear in the log.
3. If it fails, check the following: a typo in the App ID, whether the entire `.pem` went into the secret, whether the App is installed on that repo, and whether it matches the permission table.
4. If there are targets within `maxRollout`, a `라벨 생성 n, 갱신 n, 그대로 n` line (log line: labels created n, updated n, unchanged n) appears for each repo. If it is `라벨 실패 — ... 403` (label failure), the Issues permission is missing or has not been approved (Accept) yet. Even then, the sync PR is opened, and the workflow ends as failed.

To preview label changes, export the target repo's labels and pass them to the dry run. The result appears in `labels` of `plan.json` and in the console lines.

```powershell
ghp label list -R sirloinbh/study-log --json name,color,description --limit 200 | Out-File -Encoding utf8 .local/study-log-labels.json
node scripts/sync.mjs --dry-run --out .local/sync-preview --target sirloinbh/study-log --labels-from study-log=.local/study-log-labels.json
```

## Rotating the key [User]

Rotate it in these cases: every year, when the key may have been exposed, and when you change the PC you manage from.

1. In the App settings, Private keys → **Generate a private key** to create a new key. Do not delete the old key yet.
2. **Update** the central repo secret `SYNC_APP_PRIVATE_KEY` with the new key contents.
3. Run the `sync` workflow manually and check that issuing the token succeeds.
4. If it succeeds, **Delete the old key** in the App settings. If it fails, put the old key back in the secret and find the cause.
5. Delete the newly downloaded `.pem` file.
6. Record only the rotation date in a work record under `docs/changes/` or in an issue. Do not record the key contents or fingerprint.

If you suspect the key was exposed, change the order. **Delete the old key first** (the sync stops in the meantime), and then do steps 1–3.

## When changing permissions

1. Open an issue in the central repo and fix ADR-0002 and this document's permission table together.
2. **[User]** Change the permissions in App settings → Permissions.
3. **[User]** GitHub sends a permission approval request to the installed account. In Settings → Applications → Installed GitHub Apps → `project-standards-sync`, you must **Accept** the new permission for it to take effect.
