# #770 Build Docker images from the repo root and remove the lockfile reconciler

Part 2 of #728 (ADR-0022). Part 1 (the central-only removals) is merged. The images now build with the root `package-lock.json`, so the `frontend/` and `backend/` sub-lockfiles and the tool that kept them in line are not needed.

## Change

| File | Content |
|---|---|
| `templates/app/frontend/Dockerfile.tmpl`, `templates/app/backend/Dockerfile.tmpl` | Root-context Dockerfiles: copy the root `package.json`, `package-lock.json`, `.npmrc` and the two workspace `package.json` files, then `npm ci --ignore-scripts -w <workspace>`. The backend has a separate `prod-deps` stage (`npm ci --omit=dev -w backend`) and runs from `/app/backend`, so `CMD ["node", "dist/server.js"]` is unchanged |
| `templates/app/.dockerignore.tmpl` | One root `.dockerignore` (new). The per-folder `frontend/.dockerignore`, `frontend/.npmrc`, `backend/.dockerignore` and `backend/.npmrc` are no longer rendered, so sync deletes the untouched ones |
| `sync.config.json` | The `app` profile no longer takes the `backend` template folder. The service profile (shared-auth, shared-ai) keeps it: a service has one package, so its context stays `backend/` |
| `scaffold/app/compose.yaml` | `context: .` with `dockerfile: backend/Dockerfile` or `frontend/Dockerfile` |
| `.github/workflows/reusable-app-ci.yml` | `docker-build` and `image-push` build with `-f <part>/Dockerfile .` |
| `scripts/lockfiles.mjs`, `scripts/lib/lockfiles.mjs`, `scripts/test/lockfiles.test.mjs` | Removed |
| `scripts/standards-check.mjs` and its test, `templates/index.json`, scaffold `package.json.tmpl` and README | The sub-lockfile rule, the vendored reconciler files and the `lockfiles:sync` script are gone |
| `docs/dependency-policy.md` | "Sub-lockfiles" section is now "One lockfile" |
| tests, sync snapshot | Updated; new test for the root-context files |

## Per app (not in this PR)

Merging an app PR is a production deploy, so each app gets one extra commit on its sync PR branch that carries the `compose.yaml` edit (`context: .` plus `dockerfile:` for both builds) together with the new Dockerfiles, and the removal of the `lockfiles:sync` script from `package.json`. Deleting the sub-CI files and sub-lockfiles is #729.

## Checks

- Real builds on plan-routine (main at the time): `docker build -f backend/Dockerfile .` and `-f frontend/Dockerfile .` both succeed with the BuildKit secret. The backend image has no `.npmrc`, runs from `/app/backend`, has the production dependencies only, and `import('/app/backend/dist/app.js')` works. The frontend image serves `index.html` from nginx.
- `node scripts/scaffold.mjs cert-manager` renders a repo whose `docker compose config` shows both builds with the root context.
- `UPDATE_SNAPSHOT=1 npm test`: 554 pass. `npm run check`: see the PR.
- A fresh scaffold has no `package-lock.json` until its first dependency install (a user-approved step), so its images cannot build before that.

## Not done here

- `templates/app/.github/dependabot.yml` still lists `/frontend` and `/backend`; trim it with #729 when the sub-lockfiles go.
- `docs/design.md` still describes the sub-lockfiles (not an owned path; the coordinator may update it).
