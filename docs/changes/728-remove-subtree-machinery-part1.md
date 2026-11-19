# #728 Remove the subtree machinery, part 1 (central-only)

ADR-0022 (#707) drops the 24 subtree sub-repos. #728 is done in two parts so that no app build ever breaks (decided with the coordinator, 2026-11-19).

## Why two parts

`templates/app/{frontend,backend}/Dockerfile` are managed files, so a sync pushes them to all 8 apps, but each app's `compose.yaml` is repo-owned (`neverTouch`) and still builds from `./frontend` and `./backend`. Moving the Dockerfiles to the repo root context needs the Dockerfile and `compose.yaml` to change in the same commit in each app. That is part 2 and is tracked in its own issue together with #729.

## Part 1 (this change)

- `templates/app/scripts/push-repositories.ps1` is removed, so the next sync PRs delete it from the 8 apps (8 deletions in the sync snapshot).
- The sync PR body no longer asks to run it after merging changes under `frontend/`, `backend/` or `database/`.
- The text in `templates/app/AGENTS.md.tmpl`, `templates/common/skills/std-implementation/SKILL.md`, `scaffold/app/README.md`, `README.md`, `docs/agent-guardrails.md` and `docs/design.md` says the app repo is the only source and deploy repo.
- The test of the script becomes a test that it is not a template.

## Kept until part 2

`scripts/lockfiles.mjs`, `scripts/lib/lockfiles.mjs`, the `lockfiles:sync` script and the standards-check sub-lockfile rule: the Docker builds still install from `frontend/package-lock.json` and `backend/package-lock.json`, so removing the check earlier would allow drift.

## Checks

`npm run self`, `npm run plugin`, `npm run docs`, snapshot refreshed. `npm run check` result is in the PR.
