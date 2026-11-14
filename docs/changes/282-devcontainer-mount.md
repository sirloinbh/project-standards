# #282 Dev Container mounted the parent folder

- Issue: [#282](https://github.com/sirloinbh/project-standards/issues/282)
- Branch: `fix/282-devcontainer-mount`
- Date: 2026-11-14 (Asia/Seoul)

## Problem

The first real run of the workout-memo Dev Container on this PC mounted `D:\github` (every repo) at `/workspaces/workout-memo`. Then `npm ci` failed with "can only install with an existing package-lock.json". The devcontainer uses `dockerComposeFile: ["../compose.yaml", "compose.yaml"]`, and Compose resolves relative paths in every file from the first file's folder, which is the repo root. So `..` in `.devcontainer/compose.yaml` pointed to the repo's parent. VS Code "Reopen in Container" runs the same compose files, so it was affected too. The container could also write into the other repos.

## Change

- `templates/devcontainer/.devcontainer/compose.yaml.tmpl`: the bind source is `.` (the repo root), with a comment saying why.
- `scripts/test/devcontainer.test.mjs`: the text check expects `.`, and the `docker compose config` test now checks that the resolved bind source is the repo root itself.

## Checks

- Ran on this PC (Docker 29.9.2) in a throwaway workout-memo worktree with `.` mounted: `docker compose -f compose.yaml -f .devcontainer/compose.yaml up -d db dev`; in the dev container (user `node`, Node 24.21.0, npm 11.19.0) `npm ci --ignore-scripts` and `npm run check` (format, lint, types, tests with the db service, build) both passed. With the old `..` the container showed every repo under `D:\github` and `npm ci` failed.
- `npm run check`: pass (545 tests).
