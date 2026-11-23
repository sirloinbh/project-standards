# Repo Settings Baseline

The GitHub settings baseline for the 13 downstream repos (#22; the utilities `develop-skill` and `file-control` joined in #946). The "repo settings" column and section of the compliance report (`docs/compliance.md`, daily) are the result of comparing against this baseline. It is checked with the sync App's Administration, Secrets, and Variables **read** permissions, and it does not change any settings ([ADR-0002](adr/0002-github-app-for-sync.md)).

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

## What the compliance run reads and writes (#1065)

The daily compliance run uses the sync GitHub App token, one repository at a time ([github-app.md](github-app.md)). Besides the settings above it uses:

| Column or step | API | App permission |
|---|---|---|
| Work issues without epic | `GET /repos/{repo}/issues` (`parent_issue_url`, `sub_issues_summary`) | Issues: read |
| Closing finished epics (comment and close) | `GET .../issues/{n}/sub_issues`, `POST .../comments`, `PATCH .../issues/{n}` | Issues: write (the permission the label sync already needs) |

A repo where the token cannot read issues shows `unknown` in the column and the rest of the report is unaffected. Epics whose body says "keep open" or "do not close" are never closed.

### Operations columns and the daily trend (#1057)

| Column | API | App permission | Without it |
|---|---|---|---|
| CI on main | `GET .../actions/runs?branch=main&status=completed&per_page=1` | Actions: read-only (**not granted yet**, see below) | `?` |
| Sync wave, held by wave (#1075) | `GET .../commits/{sync PR head}/check-runs` | Checks: read-only (**not granted yet**) | The wave is shown; "held by wave" never appears (the CI state is unknown) |
| Alerts, Dependabot | `GET .../dependabot/alerts?state=open` | Dependabot alerts: read-only (**not granted yet**) | `?` |
| Alerts, code scanning | `GET .../code-scanning/alerts?state=open` | Code scanning alerts: read-only (granted, #260) | `?` (also on a private Free repo, where code scanning is not available) |
| Last deploy | `GET .../deployments?environment=production` and its statuses (#1086); fallback `GET .../commits/main` | Deployments: read-only (**not granted yet**); Contents (granted) for the fallback | The main head commit time, labelled "main merge, no deploy record" |
| Oldest open PR | the open PR list the run already reads | Pull requests (granted) | — |

- **Last deploy** is the time of the newest `success` status of a GitHub deployment to the `production` environment (the user chose deployment records, 2026-11-23). Until autodeploy writes them (#1087) a repo has none, and the column shows the commit time of the head of `main` labelled "main merge, no deploy record" (autodeploy ships `main`; the server's `.deployed` file cannot be read from GitHub).
- A PR whose title or label says "do not merge" is not counted as the oldest open PR. Alert counts stop at 100 and show `100+`.
- **User step:** in the App settings (Settings → Developer settings → GitHub Apps → `project-standards-sync` → Permissions) add Actions, Dependabot alerts and Deployments (all read-only), then accept the new permissions on the installation. `docs/github-app.md` and ADR-0002 list these permissions (#1086). Until then the CI and Dependabot columns show `?`, the deploy column uses the fallback, and the rest of the report is unaffected.
- **Trend:** each run adds one line `date,fail,warn` to `docs/compliance-history.csv` (a rerun on the same day replaces that day's line) and the report shows the last 14 days. `fail` counts every ✗ item (differing managed files, shared packages, `.env.example`, settings, work issues without epic, a failing CI run, open Dependabot or code scanning alerts) and `warn` every △ item (recommended settings, Korean text). The file is written in the same report PR, so the PR changes every day.

