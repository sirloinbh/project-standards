# #282 Dev Container config template for a new PC

## Change

| File | Content |
|---|---|
| `templates/devcontainer/.devcontainer/devcontainer.json.tmpl` | App `compose.yaml` + `.devcontainer/compose.yaml`, runs only `db` and `dev`, workspace folder, forwards the vite and api ports, recommended extensions. No automatic install command |
| `templates/devcontainer/.devcontainer/compose.yaml.tmpl` | The `dev` service: pinned Node image, repo mount, `DATABASE_URL` set to `db:5432`, waits for db health |
| `versions.json`, `versions.schema.json` | `images.devcontainerNode` = `node:24.21.0-bookworm@sha256:3d27e5c1…` (multi-architecture index digest) |
| `sync.config.json`, `registry/projects.schema.json`, `registry/projects.json` | Feature template `devcontainer` and `features.devcontainer` (`true` only for workout-memo) |
| `scripts/test/devcontainer.test.mjs`, `scripts/test/scaffold.test.mjs` | Receiving apps, config values, image pinning, no automatic install, and the `docker compose config` merge (5 tests) |
| `templates/app/.prettierignore.tmpl` | Added `.devcontainer/` to the managed file section (excluded from the app format check) |
| `docs/tools.md` | How to use it and its limits |

## Checks

- `node --test scripts/test/devcontainer.test.mjs`: 5 passed. We checked `docker compose config` merged with the app compose using Docker 28.3.2 on this PC.
- `docker run --rm <pinned image>`: Node v24.21.0, npm 11.19.0, git 2.39.5, user `node` (uid 1000). npm is already the `versions.json` version, so we did not add a global npm install step.
- Actually opening workout-memo with "Reopen in Container" in VS Code and running `npm run check` will be confirmed on the user's PC after the sync PR lands (issue completion criterion).
- `npm run check`: 455 of 456 tests passed, 1 skipped, 0 failed
