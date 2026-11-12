# Survey of tools for handling multiple app repos (#255)

Surveyed on 2026-10-27. This document is a comparison and a recommendation. The adoption result is written under "Decisions" at the bottom, and its application is tracked in #258. Nothing was installed during the survey.

## Current state

- Number of repos: 8 app umbrella repos, 24 subtree deploy repos (`*-frontend`, `*-backend`, `*-db`), shared-aws-infrastructure, project-standards, and file-control. People open 11 of these repos directly.
- Common files are aligned with central sync PRs (`docs/design.md`). Merging to main in an app repo is a production deploy.
- Existing tools:
  - `tools/gh-project.ps1`: fixes the sirloinbh account
  - `tools/agents`: per-repo agent workers
  - `tools/dependency-prs.mjs`: dependency PRs across all repos
  - `tools/app-secrets.mjs`: the shared Claude key
  - `open-vscode-account-b.cmd`: opens VS Code with the personal account
- App repo issues total 99 across 4 repos (2026-10-27), but **the priority label names differ per repo.** Examples: `P1 높음` (plan-routine, file-control), `우선순위: P1` (study-log), `priority:P2` (workout-memo). The central standard labels (`priority/P1` and so on, `templates/common/labels.json`) were created by sync, but issues carrying the old labels are unchanged.
- Other (work) projects on this PC use `.code-workspace`, but the sirloinbh apps do not have one.
- The GitHub CLI token scopes are `gist`, `read:org`, `repo`, and `workflow`. Working with GitHub Projects needs the extra `project` scope.

## 1. Repo structure

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| A. Keep the current structure (multiple repos + central sync) | Deploy, permissions, and CI are independent per app. Sync, compliance status, and checks are already in place | Work that crosses repos (the same fix 8 times) can only be done at once through a sync PR | **Recommended** |
| B. Monorepo (npm workspaces + Turborepo or Nx) | Change several apps in one PR, build cache | Repo history, subtree deploy, per-app auto deploy, and visibility would all have to be redone. Turborepo and Nx are new npm packages (install policy) | Not recommended |
| C. Hybrid (only common code as packages) | Already done today with the 4 packages in `packages/` | — | Included in A |

## 2. Running commands across repos

| Approach | Install | Supply chain risk | Verdict |
|---|---|---|---|
| A. A command built directly in central `tools/` (reads the repo list from the registry) | None (Node built-in modules) | None | **Recommended** |
| B. `mani` (single Go binary, YAML config) | Download a binary | Low to medium (signature and checksum checks needed) | Alternative |
| C. `gita` (Python, pip) | pip | Medium | Not recommended |
| D. `meta` (npm) | npm global install | High (npm install policy) | Not recommended |

Example commands to build with A: `node tools/repos.mjs status` (branch, changes, and commits behind per repo), `pull` (fast-forward only repos with a clean working tree), `run -- <command>` (the same read-only command in every repo). The repo list and clone locations use the registry and the parent folder rule (`docs/tools.md`).

## 3. VS Code multi-root workspace and extensions

- **Workspace file:** If `sirloinbh.code-workspace` is generated from the registry, the 8 apps and the central and infrastructure repos open in one window. The personal account terminal settings (`.vscode/settings.json`) still apply per folder. Because paths differ per PC, the file is not committed and is generated in `.local/`.
- **Recommended extensions** (`.vscode/extensions.json`, the same file as #247):

| Extension | Reason | Verdict |
|---|---|---|
| ESLint, Prettier, EditorConfig | Edit the same way as the checks already in use | Included (#247) |
| GitHub Pull Requests | View PRs and issues inside the editor | Recommended |
| Error Lens | Shows errors at the end of the line right away | Optional |
| GitLens | History view (free features only) | Optional. Not required |

The recommended extension list does not force installation. VS Code only asks "권장 확장을 설치할까요?" (Do you want to install the recommended extensions?).

## 4. Combined view of issues and PRs

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| A. Collect app repo issues in one GitHub Projects board | One screen sorted by priority and status. Web and mobile | The `gh` token needs the extra `project` scope (user step). Automatic adding across repos must be done with Projects' own workflows or a central script | **Recommended** |
| B. Print a table with a central command (like `tools/dependency-prs.mjs`) | No extra install or permissions | Viewable only in the terminal | Supports A |
| Common | — | **Unifying label names comes first.** If labels differ as they do now, neither approach can sort by priority | — |

Unifying labels means moving the old priority and characteristic labels in each app repo to the standard labels (`priority/P0` to `P4`, `type/*`). A central command builds the mapping table, and after user confirmation the labels are changed per repo. Old labels are not deleted.

## 5. Development helper tools

| Tool | What it does | Install | Need now | Verdict |
|---|---|---|---|---|
| API mocks (MSW) | Builds mock responses from the OpenAPI contract, for frontend development and tests without a backend | npm dev dependency (`msw`) per app | Medium. Only workout-memo has `features.openapi` and `contract` turned on, so the effect is small | Later (after seeing the #240 and #241 results) |
| Lighthouse CI | Checks accessibility and performance scores on every PR. Automates the checks in the `std-ux-audit` skill | External Action or npm package, Chrome in CI | Medium. All 8 apps use the same UI components, so a standard decided once can apply to all | **Recommended (start with a warning-only trial in workout-memo)** |
| Dev Container | Sets up Node, npm, and DB in one go on a new PC | Docker Desktop + VS Code extension, container image | Low. There are only 1 to 2 Windows work PCs, and versions are already aligned by `.nvmrc`, `versions.json`, and `npm run check` | Not recommended (for now) |

## Summary of recommendations

1. Keep the repo structure as is (1-A).
2. Build commands for batch status, pull, and run across repos with `tools/repos.mjs` (2-A).
3. Add a command that generates the VS Code workspace file from the registry. For recommended extensions, add GitHub Pull Requests to #247 (3).
4. Unify app repo labels to the standard labels, and collect app issues in one GitHub Projects board (4-A). Creating the board and adding the `project` scope to the token are user steps.
5. Trial Lighthouse CI in workout-memo in warning-only mode (5). MSW comes after #240 and #241, and Dev Container is not done.

## Decisions

The user chose all the recommendations, and also decided to apply MSW and Dev Container, which were recommended as on hold (2026-10-27). The repo structure stays as it is now: multiple repos + central sync.

| Adopted | Issue for application |
|---|---|
| Batch status, pull, and run commands across repos, VS Code workspace file | #276 |
| Add GitHub Pull Requests to the recommended extensions | #247 |
| Unify app repo labels to the standard labels | #277 |
| Create the GitHub Projects board and the token `project` scope (user) | #278 |
| Collect app repo issues in the board | #279 |
| Lighthouse CI trial (workout-memo, warning only) | #280 |
| MSW mocks (starting with workout-memo) | #281 |
| Dev Container (starting with workout-memo) | #282 |

Approval for installing packages and external tools (Lighthouse CI, MSW) is collected in #245.
