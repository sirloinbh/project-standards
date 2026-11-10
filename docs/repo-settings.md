# Repo Settings Baseline

The GitHub settings baseline for the 9 downstream repos (#22). The "repo settings" column and section of the compliance report (`docs/compliance.md`, daily) are the result of comparing against this baseline. It is checked with the sync App's Administration, Secrets, and Variables **read** permissions, and it does not change any settings ([ADR-0002](adr/0002-github-app-for-sync.md)).

## Baseline

| Item | Baseline | Level | Reason |
|---|---|---|---|
| Default branch | `main` | Required | Sync, CI, and deployment are based on `main` |
| Merge commits allowed | On | Required | The agent and the user merge with `--merge --match-head-commit` ([git-conventions.md](git-conventions.md)) |
| Squash and rebase merges | Off | Recommended | With a single merge method, it is easy to find PR units in the history |
| Auto-delete branch after merge | On | Recommended | Merged branches do not pile up |
| Default Actions token permission | `read` | Required | Workflows raise only the permissions they need through `permissions:` |
| PR approval by Actions | Off | Required | So automation cannot approve its own PR and bypass protection rules |
| `main` branch protection | On, at least 1 required check, no force push or deletion | Required (public repos) | So changes that have not passed CI do not enter `main` (= deployment) |
| secret scanning, push protection | `enabled` | Required (public repos) | Blocks or reports tokens and keys when committed. CI's `secret-scan` (#259) only looks for keys with a clear pattern, and secret scanning handles the other providers |
| CodeQL code scanning | Default setup `configured` | Required (public repos) | Finds known vulnerable code patterns (injection, path manipulation, and so on) on every PR. The default setup is used instead of the advanced setup so that workflow files need not be managed (#260) |
| Dependabot vulnerability alerts | On | Required | A response to supply-chain attacks. A prerequisite of the security-updates-only policy ([dependency-policy.md](dependency-policy.md)) |
| Dependabot security updates | On | Required | Same reason. Version-bump PRs are blocked by `.github/dependabot.yml` |
| Actions secret and variable names | Same as the `secrets` and `variables` lists of the `sync.config.json` target | Required (missing names) / Recommended (names not on the list) | To check that no needed secret is missing and no unused secret remains |

- **Visibility:** As of 2026-10-27, the central repo, the 9 downstream repos, and file-control are all public. So the "Required (public repos)" items above are required for every repo.
- **Private repos and plans:** On GitHub Free, branch protection (including rulesets), secret scanning, and CodeQL are not available for private repos. If a repo is switched back to private, the compliance report shows "— 요금제" (meaning "— plan limit") instead of a failure.
- **CodeQL check permission:** The compliance report checks it with `GET repos/<repo>/code-scanning/default-setup`. The sync App needs the Code scanning alerts read permission, and without it the result shows "? 확인 못 함" (meaning "? could not check") ([github-app.md](github-app.md)).
- **Values are not handled.** The secret API returns only names. The variable API also returns values, but they are discarded on receipt and only the names are kept. The test (`scripts/test/repo-settings.test.mjs`) checks that no values appear in the report.
- The secret and variable lists are currently empty for every repo. App CI uses only `GITHUB_TOKEN`. When a repo needs a secret, add the name to that target in `sync.config.json`.

## Results checked on 2026-10-22

This is the result of running ahead of time with the personal account's read API. After the App is installed (#86), the compliance report shows the same content daily.

| Repo | Required violations | Recommended | Not possible due to plan |
|---|---|---|---|
| workout-memo (public) | No branch protection, secret scanning and push protection off, Dependabot alerts and security updates off | Squash and rebase on, auto-delete branch off | — |
| The other 8 (private) | Dependabot alerts and security updates off | Same | Branch protection, secret scanning |

The default branch, merge commits, Actions token permission (`read`), and PR approval (off) match the baseline in all 9. There are no secrets or variables in any of the 9.

## Results of alignment on 2026-10-26

Following "How to align" below, the user aligned Dependabot alerts, security updates, and the merge methods of the 9 repos, and turned on secret scanning, push protection, and `main` branch protection (required checks `verify`, `docker-build`) for workout-memo. On the same day the compliance report (#230) showed ✓ for the repo settings of all 9 repos. For the later state, see [compliance.md](compliance.md).

## How to align [User]

The user changes the settings. Run the commands below with the personal account (`ghp`). Put the repo name in `<repo>`.

```powershell
# Turn on Dependabot alerts and security updates (all 9)
ghp api -X PUT repos/sirloinbh/<repo>/vulnerability-alerts
ghp api -X PUT repos/sirloinbh/<repo>/automated-security-fixes

# Merge methods (recommended)
ghp api -X PATCH repos/sirloinbh/<repo> -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true
```

All public repos turn on secret scanning, push protection, and the CodeQL default setup (the commands below, #261). Branch protection is turned on as well. The required check names for branch protection must use the names after the CI callers change in the first sync (#97), so set branch protection after #97 is merged.

```powershell
# secret scanning, push protection
# The wrapper does not accept piped input, so pass the JSON through a temporary file (#228)
$f = Join-Path $env:TEMP 'repo-security.json'
'{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}' | Set-Content -Encoding ascii $f
ghp api -X PATCH repos/sirloinbh/<repo> --input $f --jq '.security_and_analysis'
Remove-Item $f

# Turn on the CodeQL default setup (GitHub picks the languages)
$f = Join-Path $env:TEMP 'repo-codeql.json'
'{"state":"configured","query_suite":"default"}' | Set-Content -Encoding ascii $f
ghp api -X PATCH repos/sirloinbh/<repo>/code-scanning/default-setup --input $f
Remove-Item $f
ghp api repos/sirloinbh/<repo>/code-scanning/default-setup --jq '.state'   # success if it prints configured
```

Branch protection is easiest to set on the web: workout-memo → Settings → Branches → Add branch protection rule (`main`) → under "Require status checks to pass" select the CI checks, and turn off "Allow force pushes" and "Allow deletions".

On the web, turn on "Secret Protection" (secret scanning, push protection) and "Code scanning → CodeQL analysis → Default" under each repo → Settings → Code security.

To use branch protection, secret scanning, and CodeQL on private repos as well, GitHub Pro or higher is required. That is the user's decision.
