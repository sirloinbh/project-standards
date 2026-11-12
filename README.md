# project-standards

The central repository that manages, in one place, the shared standards for the `sirloinbh` personal app portfolio (8 apps + `shared-aws-infrastructure`).

- It unifies languages and frameworks, tool versions, code and Git conventions, agent instructions and skills, and directory structure.
- When a change is merged to central main, a sync PR opens in each sub-repo.
- If a sub-repo edits a centrally managed file, CI fails and points the author to open a PR in this repo.
- Values that must differ per project, such as ports and domains, are collected in a registry so you can check them at a glance.

The design is in [docs/design.md](docs/design.md), the reasons for decisions are in [docs/adr/](docs/adr/), and per-project values are in [docs/projects.md](docs/projects.md). Everything you need to do yourself is collected in [docs/user-steps.md](docs/user-steps.md).

Rule documents: [Tech stack](docs/stack.md) · [Dependency policy](docs/dependency-policy.md) · [Git conventions](docs/git-conventions.md) · [Directories and routing](docs/directory-rules.md) · [Design system](docs/design-system.md) · [Design tokens](docs/design-tokens.md) · [Environment variables](docs/env-conventions.md) · [DB migrations](docs/conventions/database.md) · [Shared domain rules](docs/conventions/domain.md) · [Runbook templates](docs/runbooks/README.md) · [Web app install (PWA)](docs/pwa.md) · [Repo settings](docs/repo-settings.md) · [Test config](docs/test-config.md)

## Current status

This repo is in the operating phase. All 8 apps and the infrastructure repo are sync targets (`maxRollout` 3 in `sync.config.json`), and a sync PR opens in each sub-repo when a change is merged to central main. Check sub-repo status in the daily-updated [compliance status](docs/compliance.md). Work order follows the GitHub issue priority labels and the [std-backlog](templates/common/skills/std-backlog/SKILL.md) rules.

## Getting started

1. Open VS Code with `VSCode-계정B-project-standards.cmd` on the desktop. It opens with the personal account (`sirloinbh`) settings.
2. In a terminal, run `ghp auth status` to confirm you are logged in as `sirloinbh`.
3. The commands below run on Node built-in modules only, with no external npm packages. `npm install` is not needed.

| Command | What it does |
|---|---|
| `npm run check` | Runs tests, the registry conflict check, and the generated-docs freshness check in one go |
| `npm test` | Tests only |
| `npm run registry:check` | Checks for port, DB name, and repo name conflicts and verifies the port formula |
| `npm run docs` | Regenerates `docs/projects.md` |
| `npm run sync:preview` | Builds the files the 9 repos would receive into `.local/sync-preview/` |

To preview the result merged with local clones, run something like `node scripts/sync.mjs --dry-run --out .local/sync-preview --local study-log=../study-log`.

## Adding a new project

1. Open an issue in the central repo.
2. Add a new entry to `registry/projects.json`.
   - `slot` is the largest slot used so far + 1. Retired slots are never reused.
   - Ports are "base value + slot" (web 8100, api 3100, e2e api 3200, vite 5200, e2e web 5300, db 15400).
   - If the domain or AWS prefix does not exist yet, set it to `null`.
3. Add the new repo to `targets` in `sync.config.json`.
4. Run `npm run docs` to regenerate `docs/projects.md`, confirm `npm run check` passes, then open a PR.
5. **[User]** Create the umbrella repo and the 3 subtree repos (`<name>-frontend`, `-backend`, `-db`).
6. **[User]** Add the new repo to the GitHub App installation scope (step 3 of [docs/github-app.md](docs/github-app.md)).
7. Create the first commit with the scaffold. The standard tree, runbooks, centrally managed files, and manifest are created in one go, so `standards-check` passes from the first commit.
   ```powershell
   node scripts/scaffold.mjs <name> --out ..\<name>     # only a new or empty folder is allowed
   cd ..\<name>; git init -b main
   ```
8. **[User]** Approve the dependency install. The versions are the same pinned versions as in the [dependency policy](docs/dependency-policy.md) table, and `.npmrc` blocks install scripts. After approval, run `npm install --ignore-scripts` to create the lockfile.
9. Get `npm run format` (aligns doc tables) and `npm run check` to pass, make the first commit, and push to the umbrella repo. After that, rule changes arrive as sync PRs.

## Changing a rule

1. Open an issue in the central repo. State why you are changing it and which repos are affected.
2. Edit the source.

   | What to change | Where to edit |
   |---|---|
   | Files copied to sub-repos | `templates/common/` or `templates/app/` (`.tmpl` is stripped on rendering) |
   | Tool versions, external Actions | `versions.json` |
   | Per-project values such as ports and DB names | `registry/projects.json` |
   | Sync targets and rollout stage | `sync.config.json` |

3. If the list of files sub-repos receive changes, update the snapshot with `UPDATE_SNAPSHOT=1 npm test` and review that change in the PR as well.
4. For a major decision, add an ADR under `docs/adr/`.
5. After the merge, a sync PR opens in each sub-repo. The user merges the app repos' PRs (merging is the production deployment).

## When standards-check fails in a sub-repo

The sub-repo CI's `standards-check` (`.standards/check.mjs`) prints the failing file and the path of that file's central source.

| Situation | What to do |
|---|---|
| A centrally managed file was edited by mistake in the sub-repo | Revert the change in the sub-repo |
| The change is needed in every repo | Open an issue and a PR in this repo and edit the "central source" shown in the output. After the merge, the sync PRs apply it to every repo |
| Only that project should differ | Open a PR that adds `path`, `reason`, and `until` (deadline, or `null` if none) to that project's `allowedDifferences` in `registry/projects.json` |
| It reports that a port or DB name differs | If the registry value is right, fix the sub-repo file. If the registry must change, follow "Changing a rule" above |
| The sub-repo has an open sync PR (`chore/standards-sync-*`) | Merging that PR first often resolves it |

There is no feature that automatically sends PRs from a sub-repo to central or automatically reverts files ([ADR-0003](docs/adr/0003-detect-and-guide-only.md)).
