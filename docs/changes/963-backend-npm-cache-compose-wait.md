# #963 Cache the npm layer in the backend image and deploy with compose up --wait

## What changed

- `templates/app/backend/Dockerfile.tmpl` and `templates/backend/backend/Dockerfile.tmpl`: `RUN npm install --global npm@...` now runs right after `WORKDIR`, before the `COPY package...` lines, in every stage. A dependency-only change no longer downloads npm again.
- `templates/backend/backend/.dockerignore.tmpl` skips `test`; the app root `.dockerignore` skips `backend/test` (the backend build only compiles `src`).
- `templates/deploy/deploy/remote-deploy.sh.tmpl`: the deploy and the rollback start use `docker compose up -d --wait --wait-timeout 180` (override with `COMPOSE_WAIT_TIMEOUT`). Compose waits for the `api` healthcheck. `health()` stays as a short second check through the web port (10 rounds, was 30), so the proxy path (#866) is still proven. On any failure the previous commit is started again, `.deployed` is not rewritten, and the script exits 1; `.previous` and `.deployed` are written only on success.
- The frontend Dockerfile has the same npm-after-COPY order; it is in `templates/app/frontend/` and left for a follow-up.

## Tests

- `scripts/test/deploy-wait.test.mjs` runs the rendered `remote-deploy.sh deploy` with fake docker, git, curl: success writes `.deployed`/`.previous`; a failing `up --wait` rolls back to the old commit, leaves `.deployed`, exits 1; a first deploy fails with no rollback.
- `scripts/test/docker.test.mjs`: layer order and dockerignore for the app and service images.

## Notes

- shared-auth#14 is already closed (it has its own healthcheck and deploy.sh); this change reaches shared-auth and shared-ai through sync.
