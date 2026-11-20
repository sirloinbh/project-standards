# #758 Render the backend Dockerfile, .npmrc and .dockerignore for the service profile

## Change

- `templates/backend/backend/`: new template folder with `Dockerfile.tmpl`, `.npmrc.tmpl` and `.dockerignore.tmpl`, moved from `templates/app/backend/`. Both the `app` and the `service` profile list the folder in `sync.config.json`, so apps and services get the same skeleton.
- `Dockerfile.tmpl`: `CMD {{project.deploy.cmd}}` (it was a fixed `["node", "dist/server.js"]`). `EXPOSE {{project.ports.api}}` was already a variable.
- `scripts/lib/vars.mjs`: `project.deploy.cmd` is `["node", "dist/server.js"]` for an app and `["sh", "-c", "node dist/migrate.js && exec node dist/server.js"]` for a service (the image creates or updates its tables before the server starts; `exec` lets SIGTERM reach node).
- `sync.config.json`: the service profile may now write `backend/Dockerfile`, `backend/.npmrc` and `backend/.dockerignore` (`neverTouchExcept`).

## Not changed

- `backend/tsconfig.json` stays a hand copy in the services. The app template extends `@sirloinbh/tsconfig`, which the services do not install; adding it needs a lockfile update with a `read:packages` token (a user step). `neverTouch` keeps `backend/**` for it.
- The apps' rendered files are unchanged (same paths and content), only their template source moved.

## Checks

- `UPDATE_SNAPSHOT=1 npm test` (the service targets now list the three files), rendered `shared-ai` Dockerfile compared with the hand copy: the only difference is the BuildKit `npm_token` secret. `npm run check`: see the PR.
