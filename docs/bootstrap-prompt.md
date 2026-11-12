# Goal
Design and create `sirloinbh/project-standards`, the central repository that manages the whole personal app portfolio.
- When a change is merged into central main, a **sync PR is opened automatically** in every downstream project. Never push directly to a downstream repo.
- If a downstream project edits a centrally managed file, the downstream CI fails and explains how to open a PR in the central repo. Changes are not sent automatically from downstream to central.
- The phase 1 deliverables are the **design documents and the repo skeleton**. Opening real sync PRs in downstream repos happens only after user approval.

# Current situation (facts)
- GitHub accounts: personal `sirloinbh`, private repos. Do GitHub work only through `ghp` or the `scripts/gh-project.ps1` wrapper; do not use the work account `gh`.
- Downstream projects: 8 apps and 1 shared infrastructure repo.
  - Apps: workout-memo (the reference project), study-log, health-log, life-journal, money-ledger, english-study, plan-routine, dev-career-portfolio
  - Each app is an umbrella monorepo plus `<name>-frontend/-backend/-db` subtree deploy repos.
  - Shared infrastructure: `shared-aws-infrastructure` (Terraform). Its structure differs from the apps, so exception rules apply (see below).
- Common stack (based on workout-memo): React + Vite + TypeScript, React Router, TanStack Query, React Hook Form, Tailwind CSS 4, Express + pg + Zod, PostgreSQL 17, npm workspaces, Docker Compose, GitHub Actions, node:test / Vitest / Playwright.
- Existing rule sources: workout-memo's `AGENTS.md`, `skills/` (`.claude/skills/` is a copy made by `npm run skills:sync`), the `shared/contract.ts` → `contract:sync` pattern, `docs/design-system.md`, `docs/ai-agent-project-setup.md`.
- Workflow: issue → `<type>/<number>-<slug>` branch → implementation + tests + `docs/changes/` record → PR. **Only the user merges PRs.** Merging an app repo into main is a production deploy.

# Security constraints (top priority)
- Because of npm supply chain attacks (the Shai-Hulud family), do not run `npm install/ci/update`, `npx <pkg>`, or `pnpm/yarn/bun install` until the user explicitly reconfirms. Our own packages are not an exception. (Since #375, `npm ci` is allowed. See [Blocking package installs by agents](agent-guardrails.md).)
- To introduce a new external tool, follow the conditions of a pinned version, 14 days since release, and `--ignore-scripts`, and report the publisher, the repository, and the verification result before introducing it.
- Do not put `.env` values, tokens, GitHub App private keys, Terraform state, or backups into repos, docs, or logs. Handle only key names and descriptions.
- Pin external GitHub Actions to a commit SHA.

# Delivery mechanism: Plan A and Plan B together

## Plan A: shared-config npm packages
- Scope: only configuration that can be used with `extends`/`import` in package form.
  - `@sirloinbh/eslint-config`, `@sirloinbh/prettier-config`, `@sirloinbh/tsconfig`, `[[optional]] @sirloinbh/design-tokens`
- Registry: GitHub Packages (`npm.pkg.github.com`), `@sirloinbh` scope, private.
- Package authoring rules (to minimize supply chain risk):
  - Keep `dependencies` at zero. Declare the plugins you need as `peerDependencies` so each downstream project pins them itself.
  - Forbid the `preinstall`, `install`, `postinstall`, and `prepare` scripts. CI checks this.
  - Pin exact versions (no `^` or `~`). Write a CHANGELOG and separate changes by semver.
  - Publish only from the central repo's CI (tag trigger). Never publish locally.
- How downstream repos use them:
  - `.npmrc` holds only `@sirloinbh:registry=https://npm.pkg.github.com` and a `${NODE_AUTH_TOKEN}` reference. Do not commit the token value.
  - Design how CI and Docker builds authenticate (Docker uses a BuildKit secret mount and leaves no token in an image layer).
  - Install after user approval, with `--ignore-scripts`.
  - Our own packages (`@sirloinbh/*`) are excluded from the 14-day rule. Instead they must meet all of these conditions:
    - The version was published only by a tag trigger in the central repo's CI (no local publish)
    - The package version matches a git tag in the central repo, and the workflow run that published it can be checked
    - The sync PR body lists that version's CHANGELOG and the central commit SHA
    - `standards-check` rechecks that the package has no install scripts and zero `dependencies`
  - External `peerDependencies` that our packages require (ESLint plugins and so on) follow the existing rules unchanged (pinned version, 14 days, `--ignore-scripts`, prior verification).
- Releasing a package version bump: the central repo's sync PR also raises the version in the downstream `package.json` (Renovate/Dependabot version bump PRs are not used). Regenerating the lockfile and updating the subtree lockfiles are left as a PR checklist and done after the user approves.

## Plan B: template file sync
- Scope: files that cannot be shipped as a package. Examples: the common part of `AGENTS.md`, `skills/`, `.claude/skills/`, `.github/` (workflow callers, issue and PR templates), `.editorconfig`, `.gitattributes`, `.nvmrc`, the common part of `.gitignore`, and document templates.
- Trigger: when a change is merged into central main, GitHub Actions creates a `chore/standards-sync-<first 7 characters of the central SHA>` branch for each target repo and opens a PR. If the same repo already has an open sync PR, it updates that PR instead of opening a new one.
- Implementation: prefer **scripts written directly in the central repo** (Node built-in modules only) over external actions.
- Authentication: create a **GitHub App** named `project-standards-sync`.
  - Limit its permissions to Contents: write, Pull requests: write, and Metadata: read. Install it only on the target repos.
  - Keep the private key only in the central repo's secrets. Each workflow run issues a 1-hour installation token and uses it.
  - Document the creation steps and the key rotation steps. The user creates and installs the App.
- Put a "Centrally managed file. Edit it in sirloinbh/project-standards" header at the top of managed files (only files whose format allows it). The header is kept in Korean in the code: `중앙 관리 파일. 수정은 sirloinbh/project-standards로`.
- Separate common files from project-specific files. Example: `AGENTS.md` (central) + `AGENTS.project.md` (project-specific), with `CLAUDE.md` referring to both.
- The sync target is the umbrella repo. For the subtree deploy repos (`-frontend/-backend/-db`), confirm that changes arrive through the existing subtree push procedure, and do not sync them directly.

## When a downstream repo edits a file: only detect and explain
- The downstream CI's `standards-check` job checks the following.
  - Whether the hash of each managed file equals the version the central repo shipped
  - Whether the Plan A package versions equal the versions the central repo specified
  - Whether the project fixed values (the registry below) match the actual settings
- If there is a violation, fail and print: which file differs, which path in the central repo to fix, and an example command to open an issue and a PR in the central repo.
- Do not build any feature that creates a PR from downstream to central automatically or reverts files.

# Project fixed value registry (values that differ per project and must not overlap)
- Source: `registry/projects.json` in the central repo (schema: `registry/projects.schema.json`). Template sync does not overwrite these values.
- Fields: project name, domain description, repo names (umbrella + 3 subtrees), ports (web / db / api / vite / e2e api / e2e web), DB name and test DB name, service domain and subdomain, AWS resource name prefix, project-specific skill names, and intentionally allowed differences (with reasons).
- Initial values (current):

  | Project | Domain (original Korean value) | web / db / api / vite |
  |---|---|---|
  | workout-memo | 운동 (workout) | 8088 / 55432 / 3001 / 5173 |
  | study-log | 공부 (study) | 8092 / 55442 / 3012 / 5172 |
  | health-log | 건강 (health) | 8093 / 55443 / 3013 / 5183 |
  | life-journal | 일기 (journal) | 8094 / 55444 / 3014 / 5174 |
  | money-ledger | 가계부 (household ledger) | 8095 / 55445 / 3015 / 5175 |
  | english-study | 영어 (English) | 8096 / 55446 / 3016 / 5176 |
  | plan-routine | 루틴 (routine) | 8097 / 55447 / 3017 / 5177 |
  | dev-career-portfolio | 커리어 (career) | 8098 / 55448 / 3018 / 5178 |

  Fill in the remaining fields by reading each repo's real files, and report any value you could not confirm, leaving it blank.
- What the central CI does:
  - Checks across all projects for overlapping ports, DB names, domains, and repo names.
  - Generates `docs/projects.md` (an overview of all projects in one table) automatically, and fails if the file is stale.
- Template sync injects these values as variables. Examples: the ports in `.env.example`, the README title.
- Procedure to add a new project: add one entry to the registry → pass the conflict check → generate the scaffold → first sync PR.

# What to unify
1. **Languages and frameworks**: Document the common stack above as an "allow list + baseline for new projects". Include the major upgrade procedure.
2. **Tool versions** (Plan B): `.nvmrc`, `packageManager` and `engines` in `package.json`, and `engine-strict=true` in `.npmrc`. Also define the Docker base image tag, the PostgreSQL version, and the CI Node version in one place, the central `versions.json`, and inject them into templates.
3. **Code conventions** (Plan A + Plan B): ESLint, Prettier, and tsconfig ship as Plan A packages, and `.editorconfig` ships through Plan B. Use the tools already installed in each project as the baseline, and mark newly introduced tools as a separate item.
4. **Git conventions** (Plan B): Conventional Commits, the branch name `<type>/<issue>-<slug>`, issue and PR templates, the `docs/changes/` record rule, the merge policy (only the user merges), and a branch protection checklist.
5. **Agent instructions and skills** (Plan B): the common part of `AGENTS.md`, common skills in `skills/`, and `.claude/skills/` sync. Project-specific skills (for example `workout-*`) are registered in the registry and excluded from sync.
6. **Directory structure and routers**: the standard directory tree, React Router page URL rules, the Express `routes/` feature module structure, the `shared/contract.ts` pattern, and OpenAPI generation rules. Guide existing repos with docs and `standards-check` warnings (warnings, not failures, at first). The scaffold template for new projects lives separately in `scaffold/`.
7. **Environment variables at a glance**: Use each repo's `.env.example` as the source, and generate `docs/env-matrix.md` centrally with every project's keys, descriptions, whether required, whether secret, default values (non-secret only), and where used. Check that it agrees with the project fixed value registry.

# Additional things to unify
- **Shared CI**: Build lint/test/build/e2e/`standards-check` as GitHub Actions reusable workflows (`workflow_call`). Downstream repos call the central workflows pinned to a tag or SHA.
- **Dependency policy**: Keep a major version unification table. Turn on Dependabot for security updates only and turn off automatic version bump PRs. Run `npm audit` regularly.
- **Design tokens**: Share the `theme.css` tokens and the `components/ui` base rules. Per-app brand colors may be overridden with variables.
- **ADRs**: `docs/adr/NNNN-*.md`. Leave the reasoning for every rule. ADRs to write first:
  - The division of roles between Plan A and Plan B
  - Why we chose a GitHub App
  - Why a downstream edit is only detected and explained
  - Why our own packages are excluded from the 14-day rule and replaced by a provenance check (external peerDependencies keep the existing rule)
  - The scope of the shared-aws-infrastructure exception
- **Compliance status**: Generate `docs/compliance.md` with each repo's compliance state (managed files match, package versions, sync PRs not yet merged and how many days old they are).
- **`.gitattributes` and line endings**: Use LF by default, and decide whether to allow CRLF for `*.ps1`. Include UTF-8 rules so Korean text does not get garbled on Windows/PowerShell.
- **Security baseline**: secret scanning, the common part of `.gitignore`, a blocked package list, and an IOC check script.
- **Common operations docs**: the format of the daily log and next steps (`docs/daily`, `docs/next-steps`), backup/restore procedures, and a deploy runbook template.

# Exception: shared-aws-infrastructure
- Include it in the sync targets, but mark it with the profile `infra` in `sync.config`.
- What applies: Git conventions, issue and PR templates, `.editorconfig`, `.gitattributes`, the common part of `.gitignore`, the common part of `AGENTS.md`, the common skills that relate to infrastructure, the security baseline, and `standards-check`.
- What is excluded: Plan A npm packages, Node/npm version files, directory and router rules, and app CI (lint/test/e2e).
- Infrastructure-only checks: `terraform fmt -check`, `terraform validate`, and `bash -n` for shell scripts.
- Sync PRs do not touch code files or `.tf` files. State in the PR body that an infrastructure repo PR does not trigger apply.
- Cross-check, as far as possible, that the AWS resource names in the app registry match the real definitions in the infrastructure repo.

# Deliverables (phase 1)
1. `docs/design.md`: the delivery flow diagram (Plan A and Plan B), the downstream detect-and-explain flow, a file classification table (Plan A package / Plan B centrally managed / project fixed value / project-specific / scaffold only), and conflict handling rules.
2. A proposal for the central repo's directory structure. At least `packages/`, `templates/`, `registry/`, `scaffold/`, `scripts/`, `.github/workflows/`, `docs/adr/`.
3. The `sync.config` schema and the initial values for the 9 target repos (the 8 apps use the `app` profile, the infrastructure repo uses the `infra` profile).
4. `registry/projects.json` with its schema, the conflict check script, and the script that generates `docs/projects.md`.
5. The sync script, the `standards-check` script, the Plan A package publish workflow, and a test for each (written with `node:test`, without external packages).
6. A procedure guide for creating and installing the GitHub App and rotating its key (mark the steps the user performs).
7. A set of ADRs and a README (the procedure to add a new project, the procedure to change a rule, and what to do when a violation is detected downstream).
8. A phased rollout plan: apply to workout-memo first → the other 7 apps → shared-aws-infrastructure, and create an issue and a PR for each repo.

# How to work
- Do not build right away. First present a design proposal and a list of open questions, and get approval.
- When you decide a rule, cite the current files in workout-memo as the evidence. If projects differ, report the differences in a table and propose whether each is a "unification target" or a "registry fixed value".
- Do not write commands for tools that are not installed as if they could be run.
- Write responses and documents in Korean. (This was the original instruction. Since #453, explanations to the user and new documents are written in English.)
