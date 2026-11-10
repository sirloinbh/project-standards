# project-standards Design

- Status: draft (issue #1). Once this document is merged, the skeleton work starts as separate issues.
- Source of requirements: [bootstrap-prompt.md](bootstrap-prompt.md)
- Decision records: [docs/adr/](adr/)

## 1. Survey results (2026-10-22, based on local repos)

### 1.1 What all 8 apps already share

| Item | Value | Source file |
|---|---|---|
| Node / npm | `24.21.0` / `npm@11.19.0` | `.nvmrc`, `.node-version`, `packageManager` and `engines` in `package.json` |
| `.npmrc` | `engine-strict=true`, `save-exact=true` | Same in all 8 |
| Identical files | `.editorconfig`, `.gitattributes`, `prettier.config.mjs`, `eslint.config.mjs`, `frontend/tsconfig.json`, `backend/tsconfig.json` | Hash comparison |
| Docker images | `node:24.21.0-alpine`, `nginx:1.27-alpine`, `postgres:17-alpine` | Dockerfile, `compose.yaml`, `ci.yml` |
| Line endings | `* text=auto eol=lf`, `*.ps1 text eol=crlf` | `.gitattributes` |
| Lint tools | `eslint 10.12.0`, `@eslint/js 10.0.1`, `typescript-eslint 8.71.2`, `globals 16.5.0`, `eslint-plugin-react-hooks 7.1.1`, `eslint-config-prettier 10.1.8`, `prettier 3.9.10` | Root `devDependencies` |
| Subtree repo names | `<name>-frontend`, `<name>-backend`, `<name>-db` | `git remote` |

### 1.2 Differences and problems

| # | Finding | Resolution |
|---|---|---|
| D1 | The source of `shared-aws-infrastructure` is `workout-memo/infrastructure/`, exported as a subtree. Terraform state is a local file (`infrastructure/terraform.tfstate`, gitignored) and there is no remote backend. | Promote to an independent source (ADR-0005, section 9) |
| D2 | Port conflicts: workout-memo's vite does not set a port, so it defaults to 5173, and health-log's vite is also 5173. workout-memo's e2e web port 5174 collides with life-journal's vite 5174. The requirements table's health-log vite 5183 differs from the actual value. | Reassign all ports (ADR-0006, section 6) |
| D3 | `frontend/` and `backend/` each have their own `package-lock.json`, and the Docker build runs `npm ci` in each folder. The production server (Lightsail) also builds images with `docker compose build`. | Design the authentication path for the tsconfig and design-tokens packages (4.3) |
| D4 | React Router, TanStack Query, RHF, Tailwind, and Playwright exist only in workout-memo. The other 7 are a react, vite, lucide skeleton. | Document the stack as "allow list + criteria for new projects"; structure rules produce warnings |
| D5 | `save-exact=true` is set, yet `^` ranges remain (`concurrently`, `react`, `vite`, `typescript`, `express`, `pg`, `zod`, `tsx`, `lucide-react`, `@types/*`). | Pin to the versions installed in the lockfile in the first sync PR (8.3) |
| D6 | External Actions are pinned by tag (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `hashicorp/setup-terraform@v3`). | Pin by SHA in `versions.json` and inject into templates |
| D7 | `ci.yml` differs in all 8. Seven apps differ only in the DB name, and workout-memo additionally has `db:migrate`, e2e, and terraform jobs. | Reusable workflow + caller templates |
| D8 | The skill naming scheme (`<proj>-foundation/implementation/testing`) is the same, but the contents differ even after normalizing the project name. | Extract the common part as `std-*`; keep existing skills as project-specific skills |
| D9 | In `.gitignore` and `.prettierignore`, only workout-memo has extra Playwright and OpenAPI lines. | Split into a common section + a project section |
| D10 | DB names: workout, study, health, journal, money, cert, plan, career. CI also uses the same DB for tests. | Fixed values in the registry; test DB is `<name>_test` |
| D11 | On this PC, TCP 50000–50059 is reserved, and 55536 is in use by Brother iPrint&Scan. 55xxx is inside the ephemeral port range of Windows and Linux. | Move DB ports outside the ephemeral port range (section 6) |

## 2. Key decisions

| Decision | Content | ADR |
|---|---|---|
| Option A packages | All 4 of `@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `design-tokens` are included in phase 1 | 0001, 0004 |
| Option B sync | `.standards/manifest.json` in each downstream repo is the source of truth for managed files, hashes, package versions, and the central SHA | 0001 |
| Authentication | GitHub App `project-standards-sync`, a 1-hour installation token per run | 0002 |
| Downstream edits | Detect and notify only. No reverting and no reverse PRs | 0003 |
| standards-check | The check script is copied into each downstream repo (`.standards/check.mjs`, a managed file) | 0003 |
| Infrastructure | Promote `shared-aws-infrastructure` to an independent source and apply the `infra` profile | 0005 |
| Ports | Reassign everything with a slot-number-based formula | 0006 |
| Skills | The common skills are `std-foundation`, `std-implementation`, `std-testing`. Existing `<proj>-*` skills are project-specific | — |

## 3. Central repo structure

```
project-standards/
├─ AGENTS.md  CLAUDE.md  README.md
├─ versions.json                  # Node, npm, Docker images, PostgreSQL, CI Node, Action SHAs, Option A package versions
├─ sync.config.json               # target repos and profiles
├─ sync.config.schema.json
├─ registry/
│  ├─ projects.json               # source of project fixed values (not overwritten by sync)
│  ├─ projects.schema.json
│  ├─ platform.json               # port scheme, reserved ports, root domain, shared AWS values
│  └─ platform.schema.json
├─ packages/
│  ├─ eslint-config/              # each package: package.json, CHANGELOG.md, README.md, source
│  ├─ prettier-config/
│  ├─ tsconfig/
│  └─ design-tokens/
├─ templates/
│  ├─ common/                     # shared by app and infra
│  ├─ app/
│  └─ infra/
├─ scaffold/app/                  # skeleton for new projects only
├─ scripts/
│  ├─ lib/                        # render, hash, manifest, registry, github-app (JWT, installation token), github-api
│  ├─ sync.mjs
│  ├─ standards-check.mjs         # source of the downstream repos' .standards/check.mjs
│  ├─ registry-check.mjs
│  ├─ gen-docs.mjs                # docs/projects.md, versions.md, design-tokens.md (--check)
│  ├─ compliance.mjs              # docs/compliance.md, docs/env-matrix.md
│  ├─ package-guard.mjs
│  ├─ ioc-scan.mjs
│  └─ test/*.test.mjs             # node:test
├─ .github/
│  ├─ ISSUE_TEMPLATE/  pull_request_template.md
│  └─ workflows/
│     ├─ ci.yml                   # central self-check
│     ├─ sync.yml                 # main push → sync PRs
│     ├─ publish.yml              # package tag → GitHub Packages
│     ├─ compliance.yml           # daily → compliance report update PR
│     ├─ reusable-app-ci.yml      # workflow_call
│     └─ reusable-infra-ci.yml    # workflow_call
└─ docs/
   ├─ design.md  projects.md  versions.md  env-matrix.md  compliance.md
   ├─ github-app.md               # App creation, installation, key rotation ([User] steps marked)
   ├─ stack.md                    # allow list, criteria for new projects, major upgrade procedure
   ├─ dependency-policy.md        # version source guide, major-version table for single-app packages, procedure for adopting external tools
   ├─ git-conventions.md  directory-rules.md  design-system.md  env-conventions.md
   ├─ runbooks/                   # deployment, backup and restore, daily and next-steps formats
   ├─ changes/
   └─ adr/
```

Central scripts use only Node built-in modules and tests run with `node --test`. In phase 1 the central repo must work without `node_modules`.

## 4. Option A: shared config packages

### 4.1 Package list

| Package | Content | peerDependencies | Used by |
|---|---|---|---|
| `@sirloinbh/eslint-config` | A factory that exports `createConfig(plugins, options)`. Same as the current `eslint.config.mjs` rules | `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`, `eslint-config-prettier` (exactly the currently installed versions) | Root |
| `@sirloinbh/prettier-config` | Common options JSON that each app's `prettier.config.mjs` loads | `prettier` | Root |
| `@sirloinbh/tsconfig` | `base.json`, `react-app.json`, `node-api.json` | `typescript` | `frontend/`, `backend/` |
| `@sirloinbh/design-tokens` | `tokens.css` (`:root` variables, no Tailwind needed), `tailwind.css` (`@theme static`), list of brand variables | None | `frontend/` |

- The ESLint config is a factory. The downstream `eslint.config.mjs` imports the peer plugins itself and passes them in. Because the package then imports no other modules, central tests can run with stubs and there are no dependency resolution problems.
- The defaults of design-tokens are the semantic tokens (ink, surface, line, danger, radius, shadow) from workout-memo's `frontend/src/theme.css`. Each app overrides its own brand colors (`--color-primary`, `--color-on-primary`, `--color-accent`, `--color-focus`). Apps without Tailwind use only `tokens.css`.

### 4.2 Authoring rules and checks

`package-guard.mjs` checks the following in central CI and right before publishing. The downstream `standards-check` runs the same checks once more against the installed packages.

- 0 `dependencies`
- No `preinstall`, `install`, `postinstall`, or `prepare` scripts
- `version` is an exact semver, and `peerDependencies` are exact versions
- `CHANGELOG.md` has an entry for that version
- Published files are restricted with the `files` field

### 4.3 Publishing and authentication

```
packages/<pkg> change PR (with version and CHANGELOG) → user merges
  → [User] push tag: <pkg>/v<version>  e.g. eslint-config/v1.0.0
  → publish.yml: package-guard → verify tag matches version → npm publish (GITHUB_TOKEN packages:write)
                 → create a GitHub Release for the same tag, recording the workflow run URL and commit SHA in the body
  → PR updating packages in versions.json → merge → Option B sync creates PRs that bump the downstream package.json versions
```

| Location | Authentication method |
|---|---|
| `.npmrc` (root, `frontend/`, `backend/` — all managed files) | `@sirloinbh:registry=https://npm.pkg.github.com`, `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`, `engine-strict=true`, `save-exact=true`, `ignore-scripts=true` |
| Downstream repo CI | `permissions: packages: read`. Pass `GITHUB_TOKEN` as `NODE_AUTH_TOKEN`. Adding the repo to each package's "Manage Actions access" is a [User] step |
| Docker build | `RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" npm ci --ignore-scripts`. The token is never passed through ARG or ENV. `compose.yaml` uses `build.secrets` and the top-level `secrets.npm_token.environment: NODE_AUTH_TOKEN` |
| Production server (Lightsail) | Put `NODE_AUTH_TOKEN` (a classic PAT with only the `read:packages` scope) in the server `.env`. Issuing and rotating it are [User] steps and are recorded in `docs/runbooks/` |
| Local | The user environment variable `NODE_AUTH_TOKEN`. Installation proceeds after user approval |

- `ignore-scripts=true` in `.npmrc` forces `--ignore-scripts` on every install. On npm 7 and later it has no effect on running `npm run <script>` directly; it blocks only pre/post hooks. None of the 8 repos currently has pre/post scripts.
- Our own packages are excluded from the 14-day rule. Instead, before opening a PR, sync checks through the GitHub API: that the version and tag match, that the Release records a publish run, and that the run is `publish.yml` and succeeded. The checked result is written in the PR body (ADR-0004).

## 5. Option B: template file sync

### 5.1 File classification

| Class | Files | If edited downstream |
|---|---|---|
| Option A package | ESLint, Prettier, tsconfig, and design token contents | Fails if the installed version differs from the manifest |
| Option B fully managed | `.editorconfig`, `.gitattributes`, `.nvmrc`, `.node-version`, `.npmrc` (root, `frontend/`, `backend/`), `eslint.config.mjs`, `prettier.config.mjs`, `frontend/tsconfig.json`, `backend/tsconfig.json`, `AGENTS.md`, `CLAUDE.md`, `skills/std-*`, `.claude/skills/std-*`, `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.standards/check.mjs`, `.standards/lockfiles.mjs`, `scripts/claude-skills.mjs`, `frontend/Dockerfile`, `backend/Dockerfile`, `frontend/nginx.conf`, `backend/src/standard/http.ts`, common UI (`features.ui`: `frontend/src/components/ui/`, the shared helpers in `frontend/src/lib/`, `frontend/src/health.ts`) | Fails if the hash differs |
| Option B section managed | `.gitignore`, `.prettierignore`, `.env.example`: above the `# --- project ---` line is the central section, below it is the project section | Only the central section hash is compared |
| Option B field managed | In `package.json` (root, `frontend/`, `backend/`): `packageManager`, `engines`, `@sirloinbh/*` versions, the 42 common app dependencies (`versions.json` `dependencies`), and the `standards:check` and `lockfiles:sync` scripts | Only the fields are compared |
| Project fixed values | Ports, DB names, repo names, domains, AWS prefix | Fails if the actual values in `compose.yaml`, `vite.config.ts`, `playwright.config.ts`, `backend/src/server.ts`, `frontend/nginx.conf`, and Dockerfile `EXPOSE` differ from the registry |
| Project specific | `AGENTS.project.md`, `skills/<proj>-*`, app code, `compose.yaml` (build secret settings are checked), `docs/changes/` | Not checked |
| Downstream lockfiles | `frontend/package-lock.json`, `backend/package-lock.json` | Fails if installed versions differ from the root `package-lock.json` ([dependency policy](dependency-policy.md#sub-lockfiles-frontend-backend)) |
| Scaffold only | `scaffold/app/**` | Warning only for existing repos (`directory-rules`) |
| Central tools | `tools/**` (account tools, local agent worker `tools/agents/`) | Not copied to downstream repos. Install once on the PC and run against a specified target repo (#19, #165) |
| Repo agent config | `.agents.json` (only repos that use the agent worker) | Not checked. The worker validates the format when it runs ([tools.md](tools.md#local-agent-worker-toolsagents)) |

The Docker files, which were identical across the 8 apps except for ports, moved to Option B fully managed (#6). The values injected into templates are as follows.

| File | Injected variables |
|---|---|
| `frontend/Dockerfile` | `versions.images.node`, `versions.images.nginx`, `versions.npm` |
| `backend/Dockerfile` | `versions.images.node`, `versions.npm`, `project.ports.api` |
| `frontend/nginx.conf` | `project.ports.api` |

Both Dockerfiles receive the package authentication token only as a BuildKit secret (`npm_token`). So each service's `build` in `compose.yaml` must have `secrets: [npm_token]`, and the top-level `secrets.npm_token.environment: NODE_AUTH_TOKEN` must exist. standards-check verifies this.

- The header text is `중앙 관리 파일. 수정은 sirloinbh/project-standards의 templates/<경로>에서` ("Centrally managed file. Edit it in templates/<path> of sirloinbh/project-standards"). In files that allow comments, it goes on the first line using `#`, `//`, or `<!-- -->`, and in `SKILL.md` it goes right below the frontmatter. JSON, `.nvmrc`, and `.node-version` are managed only through the manifest, without a header. For `.ps1`, because Windows PowerShell 5.1 reads BOM-less files as ANSI, the ASCII text `Managed file. Edit it in sirloinbh/project-standards templates/<경로>/` is used (#213).
- The central `AGENTS.md` instructs in its first section that `AGENTS.project.md` must be read, because Codex reads only `AGENTS.md` automatically. The central `CLAUDE.md` references both files.
- Template variables look like `{{project.name}}`, `{{ports.web}}`, `{{versions.node}}`, `{{actions.checkout}}`. Rendering fails if an undefined variable remains.

### 5.2 manifest

```jsonc
// downstream repo .standards/manifest.json (generated by sync. Do not edit by hand)
{
  "centralSha": "f8cec0b…",
  "profile": "app",
  "project": "workout-memo",
  "files": {
    ".editorconfig": { "mode": "full", "sha256": "…" },
    ".gitignore": { "mode": "section", "sha256": "…" },
    "package.json": { "mode": "fields", "fields": { "packageManager": "npm@11.19.0", "engines": { "node": "24.21.0", "npm": "11.19.0" } } }
  },
  "packages": { "@sirloinbh/eslint-config": "1.0.0", "@sirloinbh/tsconfig": "1.0.0" },
  "registry": { "ports": { "web": 8101, "api": 3101, "e2eApi": 3201, "vite": 5201, "e2eWeb": 5301, "db": 15401 }, "db": { "name": "workout", "testName": "workout_test" } }
}
```

The hash is the SHA-256 of the content normalized to LF. The result is the same even when checked out on Windows.

### 5.3 Sync flow

```
central main push
  └─ sync.yml (concurrency: sync, no cancellation)
      ├─ confirm central tests and registry-check pass
      ├─ App JWT → installation token per target repo
      └─ for each repo in sync.config targets with rollout ≤ maxRollout:
          ├─ render profile templates (inject registry, platform, versions)
          ├─ skip registry allowedDifferences paths
          ├─ verify own-package provenance (4.3)
          ├─ compute changes against downstream main. If there are none, exit
          ├─ if the open sync PR has commits added by a person: leave the branch alone, notify through a PR comment and a workflow warning, then exit (#367)
          ├─ if an open sync PR exists: rebuild its branch as downstream main + rendered result, force-push, and update the title and body with the latest SHA
          │  otherwise: create a chore/standards-sync-<first 7 chars of central SHA> branch and open a PR
          └─ PR body: central SHA and compare link, changed-files table, package CHANGELOG excerpts and Release links,
                      checklist (lockfile update, subtree push, "merge = production deploy"), and for the infra profile a "no apply" statement
```

- Commits are created through the GitHub API (Git Data API). Because the runner does not clone the downstream repo, no hooks or scripts of the downstream repo run.
- The only sync target is the umbrella repo. Managed files inside subtree paths, such as `frontend/.npmrc`, reach each deployment repo when the user runs the existing subtree push procedure.
- The initial value of `maxRollout` is 0. No real PR is opened without user approval.

### 5.4 sync.config schema and initial values

```jsonc
{
  "$schema": "./sync.config.schema.json",
  "maxRollout": 0,
  "profiles": {
    "app": {
      "templates": ["common", "app"],
      "packages": ["eslint-config", "prettier-config", "tsconfig", "design-tokens"],
      "ci": "reusable-app-ci.yml"
    },
    "infra": {
      "templates": ["common", "infra"],
      "packages": [],
      "ci": "reusable-infra-ci.yml",
      "neverTouch": ["**/*.tf", "**/*.tfvars", "**/*.tfvars.*", "**/*.sh", ".terraform.lock.hcl"]
    }
  },
  "targets": [
    { "repo": "sirloinbh/workout-memo",              "profile": "app",   "project": "workout-memo",         "rollout": 1 },
    { "repo": "sirloinbh/study-log",                 "profile": "app",   "project": "study-log",            "rollout": 2 },
    { "repo": "sirloinbh/health-log",                "profile": "app",   "project": "health-log",           "rollout": 2 },
    { "repo": "sirloinbh/life-journal",              "profile": "app",   "project": "life-journal",         "rollout": 2 },
    { "repo": "sirloinbh/money-ledger",              "profile": "app",   "project": "money-ledger",         "rollout": 2 },
    { "repo": "sirloinbh/cert-manager",              "profile": "app",   "project": "cert-manager",         "rollout": 2 },
    { "repo": "sirloinbh/plan-routine",              "profile": "app",   "project": "plan-routine",         "rollout": 2 },
    { "repo": "sirloinbh/dev-career-portfolio",      "profile": "app",   "project": "dev-career-portfolio", "rollout": 2 },
    { "repo": "sirloinbh/shared-aws-infrastructure", "profile": "infra", "project": null,                   "rollout": 3 }
  ]
}
```

Schema rules: `repo` starts with the `sirloinbh/` prefix and has no duplicates. For the `app` profile, `project` must exist in the registry, and for the `infra` profile `project` is `null`. `rollout` is an integer of 1 or more.

## 6. Project fixed-value registry

### 6.1 Port scheme (ADR-0006)

Each project gets one slot number `n` (01–99). Every port is `base value for its kind + n`.

| Kind | Formula | Range | Purpose |
|---|---|---|---|
| web | 8100 + n | 8101–8199 | Docker nginx, bound to 127.0.0.1 |
| api | 3100 + n | 3101–3199 | Express (local development and inside the container) |
| e2eApi | 3200 + n | 3201–3299 | API started by Playwright |
| vite | 5200 + n | 5201–5299 | Vite dev server (`strictPort: true`) |
| e2eWeb | 5300 + n | 5301–5399 | Vite started by Playwright |
| db | 15400 + n | 15401–15499 | PostgreSQL reached from the host |

- Why these were chosen:
  - Commonly used default ports (3000, 4173, 5173, 5432, 8080) are kept out of the ranges.
  - The ephemeral port ranges of Windows (49152 and up) and Linux (32768–60999) are avoided.
  - This PC's reserved ports (50000–50059) and the port in use (55536) are also avoided.
  - The last two digits alone tell you which project it is.
- Numbers in `reservedPorts` of `registry/platform.json` cannot be used by any slot. Retired slots are kept with `status: "retired"` and are never reassigned. A new project gets the largest slot used so far + 1.
- The exposed ports on the production server (`WEB_BIND`, `WEB_PORT`) are set by the server `.env`, so they are unrelated to this scheme.

### 6.2 Initial values

In the Domain column, the Korean values are the actual registry data (workout, study, health, journal, household ledger, certificate, routine, career).

| Slot | Project | Domain | web | api | e2eApi | vite | e2eWeb | db | DB name / test DB |
|---|---|---|---|---|---|---|---|---|---|
| 01 | workout-memo | 운동 | 8101 | 3101 | 3201 | 5201 | 5301 | 15401 | workout / workout_test |
| 02 | study-log | 공부 | 8102 | 3102 | 3202 | 5202 | 5302 | 15402 | study / study_test |
| 03 | health-log | 건강 | 8103 | 3103 | 3203 | 5203 | 5303 | 15403 | health / health_test |
| 04 | life-journal | 일기 | 8104 | 3104 | 3204 | 5204 | 5304 | 15404 | journal / journal_test |
| 05 | money-ledger | 가계부 | 8105 | 3105 | 3205 | 5205 | 5305 | 15405 | money / money_test |
| 06 | cert-manager | 자격증 | 8106 | 3106 | 3206 | 5206 | 5306 | 15406 | cert / cert_test |
| 07 | plan-routine | 루틴 | 8107 | 3107 | 3207 | 5207 | 5307 | 15407 | plan / plan_test |
| 08 | dev-career-portfolio | 커리어 | 8108 | 3108 | 3208 | 5208 | 5308 | 15408 | career / career_test |

Changes from the current values (before → after):

| Project | web | api | vite | db | e2e (api / web) |
|---|---|---|---|---|---|
| workout-memo | 8088 → 8101 | 3001 → 3101 | 5173 (unset) → 5201 | 55432 → 15401 | 3101 / 5174 → 3201 / 5301 |
| study-log | 8092 → 8102 | 3012 → 3102 | 5172 → 5202 | 55442 → 15402 | none → 3202 / 5302 |
| health-log | 8093 → 8103 | 3013 → 3103 | 5173 → 5203 | 55443 → 15403 | none → 3203 / 5303 |
| life-journal | 8094 → 8104 | 3014 → 3104 | 5174 → 5204 | 55444 → 15404 | none → 3204 / 5304 |
| money-ledger | 8095 → 8105 | 3015 → 3105 | 5175 → 5205 | 55445 → 15405 | none → 3205 / 5305 |
| english-study | 8096 → 8106 | 3016 → 3106 | 5176 → 5206 | 55446 → 15406 | none → 3206 / 5306 |
| plan-routine | 8097 → 8107 | 3017 → 3107 | 5177 → 5207 | 55447 → 15407 | none → 3207 / 5307 |
| dev-career-portfolio | 8098 → 8108 | 3018 → 3108 | 5178 → 5208 | 55448 → 15408 | none → 3208 / 5308 |

When the DB port changes, `DATABASE_URL` in each user's local `.env` must also be changed by hand. `.env` is not synced. Port changes are included in each app's issue and PR (section 10).

### 6.3 `registry/projects.json` entry

```jsonc
{
  "slot": 1,
  "status": "active",                       // active | retired
  "name": "workout-memo",
  "domain": "운동",
  "repos": {
    "umbrella": "workout-memo",
    "frontend": "workout-memo-frontend",
    "backend": "workout-memo-backend",
    "db": "workout-memo-db"
  },
  "ports": { "web": 8101, "api": 3101, "e2eApi": 3201, "vite": 5201, "e2eWeb": 5301, "db": 15401 },
  "db": { "name": "workout", "testName": "workout_test" },
  "service": { "domain": null, "subdomain": null },   // undecided. Fill in only the values once they exist
  "aws": { "prefix": null },                          // undecided
  "features": { "e2e": true, "openapi": true, "contract": true },
  "skills": ["workout-foundation", "workout-implementation", "workout-testing"],
  "allowedDifferences": []                            // [{ "path": "...", "reason": "...", "until": "YYYY-MM-DD" | null }]
}
```

- The schema allows `null` for `service.domain`, `service.subdomain`, and `aws.prefix`. `null` values are skipped in conflict checks and cross checks, and `docs/projects.md` shows them as "미정" (undecided).
- `ports` are written explicitly so they are easy to search. `registry-check` verifies they match the formula (`base value + slot`) and fails if they do not.

### 6.4 `registry/platform.json`

```jsonc
{
  "rootDomain": null,                      // service root domain. Undecided
  "aws": {
    "region": "ap-northeast-2",            // default in shared-aws-infrastructure variables.tf
    "accountAlias": null,
    "sharedPrefix": null                   // name prefix for shared resources. Undecided
  },
  "portScheme": { "web": 8100, "api": 3100, "e2eApi": 3200, "vite": 5200, "e2eWeb": 5300, "db": 15400, "maxSlot": 99 },
  "reservedPorts": [3000, 4173, 5173, 5432, 8080]
}
```

### 6.5 Central CI checks

- Schema validation. The schema validator is written in-house and supports only the needed subset of JSON Schema.
- Check for duplicates in slots, names, repo names, DB names, test DB names, domains (excluding `null`), and AWS prefixes (excluding `null`).
- Collect every port of every project into one set to check for duplicates, and also check for overlap with `reservedPorts`.
- Check that ports match the formula and that `allowedDifferences` entries have a reason.
- Regenerate `docs/projects.md` and compare it with the committed file. Fail if they differ.

### 6.6 Procedure for adding a new project

1. Add an entry to `registry/projects.json` with the next slot and add a target to `sync.config.json`. Because the scaffold brings in the test and common UI dependencies together, register it with `features.e2e`, `vitest`, and `ui` turned on ([test config](test-config.md)).
2. Merge a PR that passes the conflict checks and the `docs/projects.md` regeneration.
3. [User] Create the umbrella repo and the 3 subtree repos, and add them to the App installation scope.
4. Create the first commit with `node scripts/scaffold.mjs <name> --out <folder>`. It renders together `scaffold/app` (project-owned starter files), `docs/runbooks` (operations docs), a copy of the contract, and the centrally managed files and manifest that the first sync will use. Later changes arrive as sync PRs.

## 7. Detection and guidance in downstream repos

```
downstream PR / push
  → .github/workflows/ci.yml (managed file)
  → uses: sirloinbh/project-standards/.github/workflows/reusable-app-ci.yml@<central SHA>
      jobs: verify (lint, typecheck, test, deploy/*.sh syntax), e2e (when features.e2e; if e2eVisual, the pinned container e2e-visual), docker-build, standards-check
      (public apps in the registry cannot call a reusable workflow in the private central repo, so this content is expanded into ci.yml, #209)
  → standards-check: node .standards/check.mjs
      ├─ compare hashes of full and section files
      ├─ package.json fields, installed @sirloinbh/* versions, no install scripts, 0 dependencies
      ├─ compare manifest.registry against ports in compose, vite, playwright, server, nginx, Dockerfile, and DB names
      ├─ check the .env.example comment rules (docs/env-conventions.md)
      ├─ directory and router rules → ::warning (not a failure)
      └─ if there are violations, exit 1 and print:
           ✗ .editorconfig — central path: templates/common/.editorconfig
           To fix, in the central repo:
             ghp issue create -R sirloinbh/project-standards --title "<summary>"
             git switch -c fix/<issue-number>-<slug>
             (edit templates/... → test → PR)
           If it is a project-specific difference: a PR registering it, with a reason, in allowedDifferences of registry/projects.json
```

- `standards:check` is also added to the downstream repo's local `npm run check`, so the same result can be seen before committing.
- To call the reusable workflow, the [User] must turn on "Accessible from repositories owned by the user" in the central repo under Settings → Actions → General → Access.

## 8. Conflict handling rules

1. **When a central change overlaps a downstream edit:** The sync PR is always rebuilt as "downstream main + latest central rendering". So edits made downstream show up as reverts in the diff. To keep such an edit, open an issue in the central repo.
2. **When an existing file differs at first application:** Put a per-file checklist item in the PR body: "move project-specific content to `AGENTS.project.md` or the project section". Mark that the PR must not be merged before the move.
3. **When pinning `^` ranges in package.json:** sync reads the actually installed versions from the downstream `package-lock.json` (root and `frontend/`, `backend/`) and replaces the ranges with those exact versions. The declared-range fields inside the lockfile are also edited as JSON only. The installed versions do not change, so the 14-day rule does not apply. CI's `npm ci` verifies the result.
4. **When adding a new package (`@sirloinbh/*`):** The lockfile must be regenerated, so it is left on the PR checklist. After the user approves, update it with `npm install --ignore-scripts` and commit it in the same PR.
5. **When deleting a file centrally:** Only files that are in the manifest and whose current hash is the same are deleted. If the hash differs, the file is left and a warning is written in the PR body.
6. **Registry values and project-specific files:** Not overwritten. The schema rejects `allowedDifferences` without a reason. Central CI warns once `until` has passed.
7. **When central is merged again while a sync PR is open:** The same PR is updated. The branch name keeps the first SHA, and the title and body point to the latest SHA.
8. **When a sync PR stays unmerged for a long time:** `docs/compliance.md` shows the elapsed days. There is no automatic merge.

## 9. shared-aws-infrastructure (ADR-0005)

### 9.1 Promotion to an independent source (done before sync)

1. Check that the result of `git subtree split --prefix=infrastructure` is the same as `shared-aws-infrastructure` main. If it differs, report and stop.
2. [User] Move the local `workout-memo/infrastructure/terraform.tfstate` and `.terraform/` to the new local clone location. Before moving, make a state backup outside the repo. The state is not committed and its path is not recorded in docs.
3. In the shared-aws-infrastructure repo:
   - Check that its own CI (`terraform fmt -check`, `terraform validate`, `bash -n`) works.
   - Make `AGENTS.md` the source.
   - Move workout-memo's Terraform-related docs.
4. In the workout-memo repo:
   - Remove `infrastructure/` and delete the procedure for registering the `infrastructure` remote.
   - Remove the terraform job from `ci.yml`, and keep the `bash -n` check of `deploy/*.sh`.
   - Fix the paths in `scripts/push-repositories.ps1`, the ignore in `eslint.config.mjs`, `AGENTS.md`, and `docs/deployment.md`.
5. Introducing a remote backend (S3 and so on) is not part of this work. It is left as a candidate for later work.

### 9.2 infra profile

- Applied: Git conventions, issue and PR templates, `.editorconfig`, `.gitattributes`, the common part of `.gitignore` (including `*.tfstate*`, `.terraform/`, `*.tfvars`, with `*.tfvars.example` allowed), the common part of `AGENTS.md`, infrastructure-related common skills, the security baseline, `standards-check`.
- Excluded: Option A packages, `.nvmrc`, `.node-version`, `.npmrc`, directory and router rules, app CI.
- CI: `reusable-infra-ci.yml` runs `terraform fmt -check`, `terraform init -backend=false`, `terraform validate`, `bash -n` on shell scripts, and `standards-check`. The Terraform version comes from `versions.json`.
- Sync PRs do not touch `neverTouch` paths. The body includes the sentence "This PR does not change .tf files and does not trigger terraform apply" (in the sync code, the Korean text: 이 PR은 .tf 파일을 변경하지 않으며 terraform apply를 일으키지 않습니다).
- Cross check: only for projects whose `aws.prefix` is not `null`, check by text whether that prefix appears in `.tf` files. The result is only a warning.

## 10. Rollout method per standardized item

| Item | Method | Deliverable |
|---|---|---|
| Language and framework | Docs | `docs/stack.md`: allow list, criteria for new projects, major upgrade procedure (central ADR → `versions.json` → workout-memo first → the rest) |
| Tool versions | Option B + `versions.json` | `.nvmrc`, `.node-version`, `packageManager`, `engines`, `.npmrc`, Docker image tags, CI Node version |
| Code conventions | Option A + Option B | 4 packages, `.editorconfig` |
| Git conventions | Option B + docs | Conventional Commits, `<type>/<issue>-<slug>`, issue and PR templates, `docs/changes/` rules, only the user merges, branch protection checklist |
| Agent instructions and skills | Option B | Common part of `AGENTS.md`, `skills/std-*`, `.claude/skills/std-*`, `scripts/claude-skills.mjs` |
| Directories and router | Docs + warnings + scaffold | `docs/directory-rules.md`, `scaffold/app`. React Router URLs, Express `routes/` modules, `shared/contract.ts`, OpenAPI generation rules |
| Environment variables | Section management + generated docs | Central section of `.env.example` (ports and DB injected), comment rules, `docs/env-matrix.md` |
| CI | Reusable workflow | `reusable-app-ci.yml`, `reusable-infra-ci.yml`, downstream callers |
| Dependencies | Docs + Option B | Major-version unification table, `.github/dependabot.yml` (security updates only), `npm audit` results collected in `compliance.yml` |
| Design tokens | Option A + docs | `@sirloinbh/design-tokens`, common part of `docs/design-system.md` (`components/ui` rules) |
| Security baseline | Option B + scripts | Common part of `.gitignore`, banned package list, `ioc-scan.mjs`, secret scanning settings checklist |
| Operations docs | Templates | `docs/daily` and `docs/next-steps` formats, backup and restore procedure, deployment runbook |

The `.env.example` comment rule is written on the line right above the key in the form `# @desc <description> @required @secret @used=backend,compose`. Keys marked `@secret` have an empty default, and no value is written in `docs/env-matrix.md` either.

## 11. GitHub App

- Name: `project-standards-sync`. The owner is `sirloinbh`, and it is installed only on the 9 target repos and the central repo.
- Repository permissions:
  - Contents: write
  - Pull requests: write
  - Metadata: read
  - **Workflows: write**: The sync targets include `.github/workflows/ci.yml`. GitHub rejects a push that changes workflow files without this permission. It is needed in addition to the 3 permissions in the requirements (ADR-0002).
- The private key is kept only in the central repo secret `SYNC_APP_PRIVATE_KEY`. The App ID is kept in the variable `SYNC_APP_ID`. Each time a workflow runs, a 1-hour installation token is issued with a JWT. This is implemented with `node:crypto`, without an external Action.
- The creation, installation, and key rotation procedures are written in `docs/github-app.md`. The rotation procedure: create a new key → replace the secret → verify with a manual sync run → delete the old key. All of these are [User] steps.

## 12. Phased rollout plan

| Phase | Repo | Content | Performed by |
|---|---|---|---|
| 0 | project-standards | This design doc and the ADRs (issue #1) | Agent, user merges |
| 1 | project-standards | Skeleton: `registry`, `versions.json`, `sync.config`, 4 `packages/`, `templates/`, `scripts/` + tests, workflows, docs. `maxRollout=0` | Agent |
| 2 | — | Create and install the App, register secrets and variables, Actions access, push the first package tags, package Actions access, PAT for Lightsail | **User** |
| 3 | shared-aws-infrastructure, workout-memo | Promote infrastructure to an independent source (9.1) | Agent + user (state move) |
| 4 | workout-memo | (a) port reassignment PR → (b) first sync PR with `maxRollout=1`: AGENTS split, `std-*` skills, Option A packages, `^` pinning, Action SHA pinning, reusable CI | Agent, user merges |
| 5 | The other 7 apps | For each app, a port reassignment PR → a sync PR with `maxRollout=2` | Agent, user merges |
| 6 | shared-aws-infrastructure | Sync PR with `maxRollout=3` (infra profile) | Agent, user merges |
| 7 | project-standards | Start the regular `compliance.yml` runs, update `AGENTS.md` into operating instructions | Agent |

Work in each repo is done by creating an issue in that repo and using a `<type>/<number>-<slug>` branch. In app repos a merge to main is itself a production deploy, so the PR bodies of phases 4 and 5 state the deployment impact (ports, Docker build authentication).

## 13. Open items

- Because the Lightsail server builds images directly, using the tsconfig and design-tokens packages requires a `read:packages` PAT on the server (4.3). The alternative is to build images in CI and deploy them through a registry, which is outside the scope of this design.
- After adding `ignore-scripts=true`, check in phase 4 that `npm ci --ignore-scripts` in the Docker build still builds correctly with the existing dependencies (esbuild, tesseract.js, and so on). If it fails, report it in that repo's PR.
