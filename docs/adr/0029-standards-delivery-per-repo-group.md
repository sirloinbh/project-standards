# 0029. Standards delivery per repo group; utilities become sync targets

- Status: Accepted (issue #941, parent #940; user decisions relayed 2026-11-21: 1A, 2A, 3A, 4A, and the G1-G3 defaults)
- Date: 2026-11-21
- Builds on: [ADR-0001](0001-a-b-distribution-roles.md) (packages and file sync), [ADR-0005](0005-shared-aws-infrastructure-exception.md) (infra profile), [ADR-0013](0013-plugin-for-repos-outside-sync.md) (plugin for repos outside sync; this ADR replaces its decision 3).

## Context

The user sorts the repos into 4 groups and wants each group to receive what fits it, and nothing else.

| Group | Repos | Character | Channel today |
|---|---|---|---|
| 1. Hub | `project-standards` | Source of every standard. No app code, no dependencies | Self-copy (`npm run self`, checked by `self:check`) |
| 2. Shared services and infra | `shared-auth`, `shared-ai` (Node backend, deployed to the server), `shared-aws-infrastructure` (Terraform) | Used by every app. Not an app: no frontend, no registry project | Sync PRs, `service` and `infra` profiles |
| 3. Utilities | `develop-skill` (study notes and a wiki build, no program), `file-control` (Windows CLI, Node built-ins only) | Personal tools. Not deployed, no shared stack | Plugin `sirloinbh-standards` (ADR-0013) |
| 4. Web apps | `workout-memo`, `health-log`, `study-log`, `cert-manager`, `plan-routine`, `dev-career-portfolio`, `life-journal`, `money-ledger` | Same stack and layout (React, Express, PostgreSQL), deployed to the shared server | Sync PRs, `app` profile |

The user's list of web apps left out `money-ledger`. It is an `app` target in `sync.config.json` like the other 7, so it is treated as a web app here.

What the survey found (2026-11-21, central commit `39c40af`; file lists computed with `planTarget` in `scripts/lib/sync-plan.mjs`):

- A file reaches a repo through the template folders of its profile. `common` goes to every profile, so it must hold only what fits every repo.
- The plugin packages only `templates/common/skills/std-*` without template variables, plus the guard hooks (`scripts/build-plugin.mjs`). So the utilities miss `orca-lanes` (#937), `std-implementation`, the permission rules, the Codex files, the issue and PR templates, and the drift check. They also depend on a per-PC install that fails silently (ADR-0013, "Missing plugin").
- A profile with only the `common` folder already renders for a utility repo with no code change: 38 files (skills and their `.claude/skills/` copies, hooks, `.claude/settings.json`, `.codex/`, issue and PR templates, `.editorconfig`, `.gitattributes`, the central section of `.gitignore`, `.vscode/settings.json`, `.standards/`).
- `ci` in a profile is required by `sync.config.schema.json`, but no script reads it.

## Decision

1. **One channel per group.** The hub copies from its own sources. Every other group receives files through sync PRs. No group uses two channels for the same file family.
2. **Utilities become sync targets with a new `utility` profile** (`templates: ["common"]`, no packages, no CI workflow, no `neverTouch`). `develop-skill` and `file-control` are added to `sync.config.json` with `project: null`. Reasons, the same ones ADR-0013 gave for synced repos:
   - Committed skills and hooks load in interactive, headless, and cloud sessions with no install step. A missing plugin gives no error and no guard hook.
   - Permission rules, Codex files, and GitHub templates cannot ship in a plugin.
   - Every change arrives as a reviewable PR and the manifest hash check catches drift.
   - New shared skills reach the utilities with no extra rule: every skill under `templates/common/skills/` goes to every group. The `std-` prefix no longer decides delivery.
3. **Utilities do not receive** `AGENTS.md`, `CLAUDE.md`, `.claude/rules/`, a CI workflow, tool version files, packages, or deploy files. Each utility has one narrow purpose and its own instructions and CI (`file-control` tests on a Windows runner with Node 22 and 24; `develop-skill` builds a wiki). The shared skills carry the common procedure.
4. **The plugin is retired** after both utilities have merged their first sync PR (ADR-0013 decision 2 already forbids enabling it in a synced repo). `scripts/build-plugin.mjs`, `plugins/`, `.claude-plugin/`, and `plugin:check` are removed, and each utility's first sync PR drops the `extraKnownMarketplaces` and `enabledPlugins` entries, so no skill loads twice.
5. **Rule for `templates/common/`:** a file belongs there only if it is correct in a repo with no Node code and no deploy (think of `develop-skill`). Anything else goes in a profile folder (`app`, `service`, `infra`) or a feature folder.
6. **Existing targets are unchanged** by this ADR. The gaps below are separate follow-up issues.

## Matrix

Cells: **Sync** (arrives through the group's channel: self-copy for the hub, sync PR for the others), **No** (do not sync), **Plugin only**. A cell in bold-italic text changes with this ADR.

### Agent files

| File family | 1. Hub | 2. Services and infra | 3. Utilities | 4. Web apps |
|---|---|---|---|---|
| General skills (`templates/common/skills/`: `std-backlog`, `std-code-review`, `std-communication`, `std-feature-overview`, `std-git-writing`, `std-session-notes`, `orca-lanes`) | Sync: self-copy to `.claude/skills/` | Sync: same issue, PR, and review procedure | ***Sync*** (today plugin only, and without `orca-lanes`): the user wants them synced | Sync |
| `std-implementation` (rendered with the repo name) | No: the hub's procedure is its own `AGENTS.md` | Sync | ***Sync*** (today nothing): it only names the repo and points at the repo's own instructions | Sync |
| App skills (`templates/app/skills/`: `std-foundation`, `std-testing`, `std-ux-audit`), `scripts/claude-skills.mjs` | No: they describe the app stack | No: same reason | No: same reason | Sync |
| `AGENTS.md`, `CLAUDE.md` | No: own files, the source of the procedure | Sync (`templates/service/`, `templates/infra/`). Infra was a hand-written copy until #949 (gap G1) | No: each has a single-purpose `CLAUDE.md` that a shared procedure would dilute | Sync (`templates/app/`) |
| `.claude/rules/` (path rules) | No: own rules about sources and copies | No: the rules are about the app's `frontend/`, `backend/`, `database/` | No: same reason | Sync |
| Guard hooks (`.claude/hooks/`) | Sync: self-copy | Sync | ***Sync*** (today plugin only): a committed hook cannot be silently missing | Sync |
| `.claude/settings.json` (permission rules, hook registration) | Sync: self-copy | Sync | ***Sync*** (today repo-owned): a plugin cannot ship permission rules, and the hooks need this file to run | Sync |
| `.codex/` (hooks, rules) | Sync: self-copy | Sync | ***Sync*** (today nothing): same guard for Codex sessions | Sync |
| `orca.yaml` (folders Orca shares with worktrees) | No: no `node_modules` | No: it lists the app's three `node_modules` folders | No: same reason | Sync |

### GitHub

| File family | 1. Hub | 2. Services and infra | 3. Utilities | 4. Web apps |
|---|---|---|---|---|
| Issue and PR templates | Sync: self-copy | Sync | ***Sync*** (today nothing): `std-git-writing` expects them | Sync |
| Issue labels (`templates/common/labels.json`, applied by the sync run) | Source | Sync | ***Sync*** (today a manual tool run, `file-control` only): `std-backlog` needs the labels | Sync |
| CI workflow (`.github/workflows/ci.yml`) | No: own `ci.yml` | Sync: `reusable-service-ci.yml`, `reusable-infra-ci.yml` | No: no shared shape (Windows test matrix; wiki build). Each keeps its own workflow and adds one `node .standards/check.mjs` step | Sync: `reusable-app-ci.yml` |
| `.github/dependabot.yml` (security updates only) | No: no dependencies | Services: Sync since #959 (`/backend` lockfile). Infra: No | No: no npm dependencies | Sync |
| Repo settings baseline (`docs/repo-settings.md`, compared daily) | Checked by hand (not a sync target) | Sync (checked) | ***Sync*** (checked once they are targets) | Sync (checked) |
| Compliance: `.standards/` (check script, manifest, secret and IOC scan, blocked packages) and the daily report | No: runs the sources directly in `npm run check` | Sync | ***Sync*** (today nothing): drift in the synced agent files must be visible | Sync |

### Repo basics and tooling

| File family | 1. Hub | 2. Services and infra | 3. Utilities | 4. Web apps |
|---|---|---|---|---|
| `.editorconfig`, `.gitattributes`, central section of `.gitignore`, `.vscode/settings.json` (personal-account terminal) | No today: own copies that nothing checks (gap G3: `.vscode/settings.json` still names the old tool folder) | Sync | ***Sync*** (today nothing): they are correct in any repo, and the terminal profile keeps the personal account | Sync |
| Node tool versions and lint config (`.nvmrc`, `.node-version`, `.npmrc`, `eslint.config.mjs`, `prettier.config.mjs`, `knip.json`, managed `package.json` fields) | No: `versions.json` is the source | Services: Sync since #959 for `.nvmrc`, `.node-version`, and the `engines` and `packageManager` fields only (no lint config). Infra: No, no Node code | No: `file-control` supports Node 22 and 24 with zero dependencies; `develop-skill` has no Node code | Sync |
| Shared packages (`@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `auth-client`) | Source (`packages/`) | No: profile `packages` is empty; a service pins what it uses itself | No: no dependencies by rule | Sync: versions as managed fields |
| Design tokens (`@sirloinbh/design-tokens`) | Source | No: no UI | No: no shared UI | Sync |

### App code and deploy

| File family | 1. Hub | 2. Services and infra | 3. Utilities | 4. Web apps |
|---|---|---|---|---|
| Backend standard files (`templates/app/backend/`, `templates/jobs/`) | No | No, except 3 verifier files that `shared-ai` receives as a test fixture (#672) | No | Sync (`jobs` by feature flag) |
| Service Docker files (`templates/backend/`) | No | Services: Sync. Infra: No | No | No: apps have their own Dockerfiles in `templates/app/` |
| Frontend base, shared UI, MSW, React Query, Vitest (`templates/app/frontend/`, `ui`, `msw`, `query`, `vitest`) | No | No: no frontend | No: `file-control`'s local screen is not the app shell | Sync (by feature flag) |
| E2E, Lighthouse, dev container (`templates/e2e/`, `lighthouse`, `devcontainer`) | No | No | No | Sync (by feature flag) |
| Server deploy scripts (`templates/deploy/`: autodeploy, backup, restore check, notify, daily report since #967) | No | Services: Sync. Infra: No (it creates the server; it is not deployed to it) | No: not deployed | Sync |
| App deploy extras (`templates/app/deploy/`, app Dockerfiles, `nginx.conf`) and the service `deploy.sh` | No | Services: Sync (`templates/service/deploy/`). Infra: No | No | Sync |
| Files generated from the registry (`apps.json`, `apps.generated.ts`) | Source (`registry/`) | Sync where the target lists `generatedFiles` (`shared-aws-infrastructure`, `shared-ai`) | No | No |
| Scaffold (`scaffold/app/`) | Source | No | No | No: only for creating a new app repo |

## Gaps found in the other groups (follow-up issues; the user accepted the proposed defaults)

- **G1. Infra `AGENTS.md` and `CLAUDE.md` are hand-written copies** of the common procedure (design.md 9.2 says the common part is applied, but `templates/infra/` has only `ci.yml`). Proposed: give `infra` the same split the services have (managed `AGENTS.md` and `CLAUDE.md`, repo rules in `AGENTS.project.md`). Done in #949: the template keeps the Terraform prohibitions and verification commands word for word, and `CLAUDE.md` now imports both files with `@` (the hand-written one only linked them, which Claude Code does not follow).
- **G2. The two services get no Node version files and no `dependabot.yml`**, although each has `backend/package.json`. Proposed: research what fits (`.nvmrc`, `.node-version`, security-only Dependabot) and add it to `templates/service/` or `templates/backend/`. Researched in #950 and done in #959: `engines` and `packageManager` in `backend/package.json` are managed fields (the managed `backend/.npmrc` is `engine-strict`, so a hand-pinned value would break `npm ci` on a central version bump), and the services get `.nvmrc`, `.node-version`, and a security-only `dependabot.yml`. Their dependencies stay their own.
- **G3. The hub's own `.editorconfig`, `.gitattributes`, and `.vscode/settings.json` are not in `SELF_COPIES`.** `.vscode/settings.json` has drifted: it still starts `%LOCALAPPDATA%\gh-workout-memo\project-terminal.ps1`, the old location `AGENTS.md` says not to use. Proposed: add them to `scripts/build-self.mjs`. Done in #951 for `.editorconfig` and `.vscode/settings.json`; `.gitattributes` stays the hub's own file because it adds a `*.cmd` line for `tools/`.

## Choices and the user's decisions (2026-11-21)

The user chose option A in all four.

1. **How utilities receive the shared skills.** A (recommended): the `utility` sync profile above. B: keep the plugin and widen it to every skill in `templates/common/skills/` without template variables. B is a small change to `scripts/build-plugin.mjs`, but keeps the silent-failure install step and still cannot deliver permission rules, Codex files, GitHub templates, or a drift check.
2. **The plugin after the utilities are synced.** A (recommended): remove it, so there is one channel (it can be rebuilt from git history). B: keep building it for a future repo outside sync; then it must stay disabled in every synced repo.
3. **Utilities' `.claude/settings.json`.** A (recommended): fully managed, like every other target. `develop-skill` loses its repo-level list of 8 turned-off plugins; they move to user settings or `.claude/settings.local.json` before the first sync PR is merged, so none is lost. B: leave the file repo-owned for utilities; then the guard hooks are not registered and do not run, so B really means "skills only".
4. **Drift check in the utilities.** A (recommended): each utility's own CI gains one `node .standards/check.mjs` step. B: no CI step; only the daily compliance report shows drift.

User steps this needs: install the GitHub App `project-standards-sync` on `develop-skill` and `file-control` ([github-app.md](../github-app.md)), and uninstall the plugin on each PC once it is retired.

## Consequences

- `sync.config.json` gains the `utility` profile and 2 targets (13 in total). `ci` becomes optional in `sync.config.schema.json`.
- The first sync PR in each utility adds about 38 managed files. `.gitattributes` (`* text=auto eol=lf`) can renormalize line endings there, so that PR is reviewed for unrelated diffs, and `file-control`'s Windows tests must pass on it.
- `file-control`'s `CLAUDE.md` copies the review-and-merge procedure by hand and names an older account setup. Its onboarding PR replaces that part with a pointer to the synced skills.
- The compliance report and the repo settings baseline start covering the two utilities.
- ADR-0013 stays as the record of the plugin research. Its decisions 1, 2, and 4 hold; decision 3 is replaced by this ADR.

## Follow-up work (sub-issues of #940)

State on 2026-11-21: the profile (#944), the App install (#945), the targets (#946), the onboarding (#947, `develop-skill#41`, `file-control#333`), the plugin removal (#948), G1 (#949), G2 (#950, #959), and G3 (#951) are done. The matrix above describes the state after them; "today" in a cell means before this ADR.


- Add the `utility` profile, make `ci` optional, add the two targets, update tests and the snapshot.
- `[Manual]` Install the GitHub App on the two utility repos.
- Onboard `file-control` and `develop-skill`: review and merge the first sync PR, drop the plugin settings, add the check step to their CI, trim `file-control`'s `CLAUDE.md`.
- Retire the plugin and update `docs/tools.md`.
- G1, G2, G3 above, one issue each.
