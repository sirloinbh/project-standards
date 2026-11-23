# Project Standards Agent Instructions

This repository is the central repo for `sirloinbh`'s personal app portfolio (8 apps + `shared-aws-infrastructure` + the shared services `shared-auth` and `shared-ai` + the utilities `develop-skill` and `file-control`). It manages the shared standards: settings, conventions, skills, and fixed project values.

## Current phase: operation

- The design source is [docs/design.md](docs/design.md) and [docs/adr/](docs/adr/). The requirements source is [docs/bootstrap-prompt.md](docs/bootstrap-prompt.md).
- The "12. Phased rollout plan" in design.md is done (#116). `sync.config.json` lists the targets (none has `enabled: false`), so all 8 apps, the infrastructure repo, the shared service repos (`shared-auth`, `shared-ai`, `service` profile), and the utilities (`develop-skill`, `file-control`, `utility` profile: agent files only) are sync targets. Which file families each group receives is in [ADR-0029](docs/adr/0029-standards-delivery-per-repo-group.md).
- Order for changing a standard from now on: fix the source in this repo → `npm run check` → merge the PR in this repo (agent) → `sync.yml` opens or updates the sync PRs in the downstream repos → the agent reviews each sync PR, records it on the issue, and merges it once CI is green (#591).
- When you must add a commit directly to a sync PR (for example when a shared package grows and the lockfile needs an update), do not start the commit message with `chore: sync central standards (project-standards@`. The sync bot does not overwrite a branch that has such a commit; it reports it with a PR comment and a workflow warning (#114, #367). While that PR is open, central changes are not applied, so run the `sync` workflow after merging it.
- The agent merges the daily compliance report PR (`chore/compliance-report`). Register each new `✗` item as an issue in the affected repo or in this repo.

## Work procedure

- To register requirements as issues or to choose the next task, follow the [std-backlog](templates/common/skills/std-backlog/SKILL.md) skill.
- To write issues, branches, commits, and PRs, follow the [std-git-writing](templates/common/skills/std-git-writing/SKILL.md) skill and the issue and PR templates in `.github/`. To review a PR (sync PRs included), follow [std-code-review](templates/common/skills/std-code-review/SKILL.md) (#497).
- Write explanations to the user in English, as the [std-communication](templates/common/skills/std-communication/SKILL.md) skill says (#454). Write issues, branches, commits, and PRs in English too.
- Keep progress, decisions, and next steps in md files, not in the chat or memory, as the [std-session-notes](templates/common/skills/std-session-notes/SKILL.md) skill says (#452). A new session reads the latest `docs/daily/` file first.
- Choose the Claude model and effort for a session by task type, as [docs/model-selection.md](docs/model-selection.md) says (#440). Decide it when you start the session and do not change it mid-session.

1. Register an issue in `sirloinbh/project-standards`. If the user named an existing issue, reuse it.
2. Create a branch that contains the issue number: `<type>/<issue-number>-<slug>`.
3. Commit the implementation, the tests, and the `docs/changes/<issue-number>-<slug>.md` record together.
4. Run the relevant tests before committing and before creating or updating a PR. Record the results in the docs and the PR.
5. **The agent reviews and merges its own PRs, in this repo and in every other sirloinbh repo** (user decision, 2026-10-22, #128; extended to all repos on 2026-11-15, #591). Review the PR 1 or 2 times with std-code-review section 8 (more only while blocking findings remain), fix findings on the same branch, and register a new issue for any big problem outside the PR. After `npm run check` passes and the PR body follows the template, merge with a merge commit (`pr merge --merge`; do not use `--delete-branch`, because local branches are cleaned up with the git CLI steps in std-git-writing), then continue with the next issue in std-backlog order.
   - Merging an app repo to main can be a production deploy; the user chose auto-merge there too. Merging is not applying: `terraform apply` and other real AWS or production changes still need the user's OK.
   - Still ask the user first for: `[직접]` (user does it directly) and `needs-user` issues, package installs outside the pre-approved scope, and decisions the issue marks as "user confirmation".
   - If the PR body lists an item to confirm before merging, do not merge; ask the user.

Answering questions, giving recommendations, and read-only investigation do not create an issue or a branch.

## Verification commands

This works with Node built-in modules only, with no external npm packages. Do not run `npm install` in this repo (it has no dependencies); in app repos agents may run `npm install --ignore-scripts` (#629).

| Command | When |
|---|---|
| `npm run check` | Before every commit and PR. Tests, registry conflicts, whether generated docs and design tokens are current, package rules, workflow checks, relative links and anchors in the Markdown files |
| `npm run links:check` | After renaming a file or heading in the docs: a second. Part of `check` and `check:docs` |
| `npm run check:docs` | Docs-only changes (no change under `scripts/`, `templates/`, `packages/`, `registry/`, `versions.json`, or `sync.config.json`): a few seconds. CI still runs `npm run check` |
| `UPDATE_SNAPSHOT=1 npm test` | When the list of files downstream repos receive changed. Review the snapshot change in the PR |
| `npm run docs`, `npm run tokens` | To regenerate the generated docs after changing the registry or tokens |
| `npm run sync:preview` | To preview the files downstream repos will receive in `.local/sync-preview/` |

## Path-specific rules

These live in `.claude/rules/`. Claude Code loads each one when it works on matching files; other agents read the matching file before changing those paths.

- [sources-and-copies.md](.claude/rules/sources-and-copies.md): which file is the source and which are copies (`templates/`, `.claude/`, `.codex/`, `.github/`, `versions.json`, `registry/`, `sync.config.json`). Edit the source and copy it in the same PR.
- [sync-and-deploy.md](.claude/rules/sync-and-deploy.md): how sync, package releases, the compliance report, and app deploys work (`sync.config.json`, `packages/`, workflows, sync and compliance scripts).

## Prohibited actions

- Do not make remote changes with the default `gh` (the work account). Use the wrapper in "Accounts and security" below.
- Do not push directly to downstream repos. Follow each repo's issue and PR procedure for downstream changes.
- Do not remove or update npm packages or run `npx`. Adding a package with `npm install --ignore-scripts --save-exact` is allowed in app repos since #629 (user decision 2026-11-18), following the dependency policy; for anything else the exception is when the user explicitly reconfirms; the conditions are in [docs/dependency-policy.md](docs/dependency-policy.md) and [docs/agent-guardrails.md](docs/agent-guardrails.md).
- Do not commit `.env` values, tokens, GitHub App private keys, Terraform state, or backups, and do not record them in docs, PRs, or logs.
- Do not pause or enable a sync target (`enabled` in `sync.config.json`), push package tags, or do user steps on the user's behalf.
- Do not overwrite user changes. Stage only the files you need, by name.

## Accounts and security

- Do GitHub work with the personal account `sirloinbh`. Use the `ghp` function or the `gh-project.ps1` wrapper. They live in `%LOCALAPPDATA%\sirloinbh-tools\` ([docs/tools.md](docs/tools.md)). Do not use the old location `%LOCALAPPDATA%\gh-workout-memo\` (deleting it is a user step).
- Git authentication is handled by the repo-local credential helper (`gh-project.ps1 auth git-credential`). The commit author is applied automatically from `~/.gitconfig-personal` based on the remote URL.

## Responses

- Write explanations to the user, issues, PRs, and new documents in English. Existing Korean documents are translated in sub-issues of #453.
