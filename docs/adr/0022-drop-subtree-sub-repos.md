# 0022. Drop the git subtree sub-repos; deploy from the umbrella repo

- Status: Accepted (issue #707, parent #666; user decision relayed 2026-11-19)
- Date: 2026-11-19
- Builds on: the architecture review of 2026-11-18, findings 3.3 and M8 (workout-memo W12).

## Context

- Each app has an umbrella repo and three deploy sub-repos (`frontend`, `backend`, `database`): 8 apps × 3 = 24 sub-repos. `push-repositories.ps1` copies each folder to its sub-repo with `git subtree split` and a push.
- Nothing reads the sub-repos. The server deploys from the umbrella repo, and the sub-repos have no known reader.
- The sub-repos cost real work:
  - `scripts/lib/lockfiles.mjs` (205 lines), `scripts/lockfiles.mjs` (61 lines) and their tests exist only to rebuild the sub-lockfiles from the root lockfile.
  - Each app keeps `frontend/.github/workflows/ci.yml` and `backend/.github/workflows/ci.yml` (16 files). They never run in the umbrella repo and cannot install `@sirloinbh/*` packages. They use unpinned actions and `npm ci` without `--ignore-scripts`.
  - `push-repositories.ps1` cannot fast-forward onto the single-commit sub-repos (#653).
  - Docker builds use `./frontend` and `./backend` as contexts so that the sub-lockfiles can be found.

## Decision

1. Drop the git subtree sub-repos. The umbrella repo is the only deploy source.
2. Docker builds move to the repo root as context and use the root `package-lock.json`.
3. Remove the lockfile reconciler (`scripts/lib/lockfiles.mjs`, `scripts/lockfiles.mjs`, `PACKAGE_FILES` in the sync code and their tests), the `lockfiles:sync` script, `push-repositories.ps1`, and the "run `push-repositories.ps1`" checklist item in sync PRs.
4. Remove the 16 sub-CI files and the sub-lockfiles (`frontend/package-lock.json`, `backend/package-lock.json`) from every app.
5. Close #653: its script is removed rather than fixed.

## Not decided here

- **[Manual]** Archiving or deleting the 24 GitHub sub-repos is a user step (it changes real repositories and cannot be undone by an agent). Archiving keeps the history and is reversible; deleting is not. The user does this after the removal issues below are done, so no pipeline still pushes to them.

## Consequences

- One lockfile per app, and no step that can drift from it.
- The Docker contexts change; this is a deploy change for each app (merging to main deploys) and goes through the removal issue, one app at a time.
- Two follow-up issues carry the work: #728 (central removal and Docker contexts) and #729 (the 8 apps, plus the `[Manual]` sub-repo step). #729 waits for #728.

## Revisit when

- A part of an app needs its own repository again (for example a public frontend). Then split it out with a one-off export rather than a standing subtree.
