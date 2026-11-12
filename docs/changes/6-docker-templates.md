# #6 Docker build file templates (2 Dockerfiles, nginx, compose check)

## Change

| File | Content |
|---|---|
| `templates/app/frontend/Dockerfile.tmpl` | Based on the current files of the 8 apps |
| `templates/app/backend/Dockerfile.tmpl` | Same. `EXPOSE` is the registry API port |
| `templates/app/frontend/nginx.conf.tmpl` | Same as the current files of the 8 apps. Only `proxy_pass` is the registry API port |
| `scripts/standards-check.mjs` | A repo whose Dockerfile is managed centrally also gets its `compose.yaml` checked. It checks that every `build` passes `secrets: [npm_token]` and that the top-level `secrets.npm_token.environment: NODE_AUTH_TOKEN` exists |
| `docs/design.md` 5.1 | In the classification table, moved the 2 Dockerfiles and nginx.conf from project-specific to option B full management, and added an injected variable table |
| `scripts/test/docker.test.mjs`, `standards-check.test.mjs`, snapshot | Rendering results, how the token is passed, and the compose check. 3 files added per app to the downstream repo file list |

## Differences from the current files (intended changes)

- **Token passing:** `npm ci` receives the token only through a BuildKit secret (`npm_token`). It is not passed by ARG or ENV, so no token remains in image layers. A test confirms there are no ARG or ENV lines.
- **Install options:** `--ignore-scripts` is added to `npm install --global npm@…`, `npm ci`, and `npm prune`.
- **`.npmrc` copy:** `.npmrc` is copied together with `COPY package*.json .npmrc ./`, because the package registry settings must be present before `npm ci`.
- **When there is no secret:** without a secret, as in a local `docker compose build`, the token is empty. While there are no shared packages yet, it still builds.
- The `# syntax=` directive is not used, because it would pull the builder image separately from Docker Hub. `RUN --mount` works in the default BuildKit.

## Checks

- `npm run check`: 123 tests passed, `check-workflows: ok (8 files)`
- The real Docker build of downstream repos will be verified in the `docker-build` job of the CI of the first sync (#97) (`--secret id=npm_token,env=NODE_AUTH_TOKEN`).
