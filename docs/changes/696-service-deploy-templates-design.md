# 696: design for rendering the service deploy files from the shared deploy templates

Status: proposal. No template, script, or registry change in this PR. Issue #696 stays open; the implementation PR follows after the choices in "Open choices" are made.

## Problem

`shared-auth` and `shared-ai` (profile `service`) keep a hand copy of `deploy/` (11 files each), the backend `Dockerfile`, `.npmrc` and `tsconfig.json`. `sync.config.json` lists `deploy/**` and `backend/**` under `neverTouch` for the profile, so the copies drift. Measured on 2026-11-19 by rendering `templates/app/deploy/*` with each service's names and comparing line by line:

| File | Lines only in the service | Lines only in the app template |
|---|---|---|
| `autodeploy.service`, `backup.service`, `restore-check.service` | 2 to 3 | 2 to 3 |
| `autodeploy.timer`, `backup.timer`, `restore-check.timer` | 1 to 2 | 1 to 2 |
| `autodeploy.sh` | 10 | 10 |
| `backup.sh` | 18 | 23 |
| `install-autodeploy.sh`, `install-backup.sh`, `notify.sh` | 2, 8, 5 | 2, 15, 19 |

The two services' own files are identical except for names, and `shared-ai`'s `deploy.sh` differs from `shared-auth`'s in the `.env` bootstrap and in the `@required` handling of SSM keys. The services have no `health.*`, `report.*`, `ssm-get.sh` or `remote-deploy.sh`; they have `deploy.sh` instead.

What the hand forks lack compared with `remote-deploy.sh` (the problems the issue names):

- No rollback when the health check fails: `deploy.sh` ends with `exit 1` and the new, broken containers keep running. A bad `shared-auth` commit signs every app out with no automatic recovery.
- No pruning of old images or of the builder cache, so the disk grows with each deploy.
- `flock 9` waits forever; the template uses `flock -w 1800` and exits with 4.
- An inline SSM reader instead of `deploy/ssm-get.sh`.
- The Dockerfiles have drifted from the template: `shared-auth` has no `exec` in `CMD`, and neither uses the BuildKit `npm_token` secret.

Real differences that the templates must keep:

| | apps | `shared-auth` / `shared-ai` |
|---|---|---|
| Images | `<db>-backend`, `<db>-frontend` | `shared-auth-backend` (one image) |
| Web port | published by the `web` (nginx) container, `80` inside | published by the `api` container directly (`3110` / `3111` inside) |
| Health URL | `http://127.0.0.1:$WEB_PORT/api/health` | same URL, but the port is the API's |
| Migrations | a deploy step: `run --rm api node dist/migrate.js` with the migrations mounted | inside the image `CMD`: `node dist/migrate.js && exec node dist/server.js` |
| `.env` on first deploy | created by the user | created by the script (`POSTGRES_PASSWORD`, and for `shared-auth` `BETTER_AUTH_URL`, `ROOT_DOMAIN`) |
| SSM keys | a failed read warns and keeps the `.env` value | `shared-auth`: any failure aborts; `shared-ai`: only `@required` keys abort |
| Entry script | `deploy/remote-deploy.sh deploy <ref>` / `rollback` | `deploy/deploy.sh [--no-pull]` |

## Proposal (recommended: option 1 below)

The renderer has no conditionals, but the app script already branches at run time on a rendered value (`[ "{{project.features.claude}}" = true ]`). Use the same trick so that `renderer`, `scripts/lib/` and the other lanes' paths stay untouched.

1. **Registry.** Give each `sharedServices` entry the values the templates read: `db.name` (`auth`, `ai`), `title`, `deploy.images` (a space-separated list), `deploy.healthPort` (which compose port the health check reads), `deploy.migrate` (`step` for apps, `image` for services), and `deploy.cmd`. `buildVars` fills `project` from `sharedServices` for service targets, so the templates keep using `{{project.name}}`, `{{project.db.name}}` and `{{project.ports.*}}`.
2. **One deploy script.** `templates/app/deploy/remote-deploy.sh.tmpl` becomes the single `deploy/remote-deploy.sh` for apps and services. At run time it loops over `deploy.images` for pruning, skips the migrate step when `deploy.migrate` is `image`, and reads the health port from the value above. The service gets rollback, pruning and the lock timeout from the same code the apps use. The `.env` bootstrap stays outside it, in a project-owned `deploy/bootstrap-env.sh` that the script runs when `.env` is missing and the file exists (the services keep their current logic there).
3. **Shared files.** The 9 files that differ only by name move to a new `templates/deploy/` folder that both profiles include (`["common", "deploy", "app"]`, `["common", "deploy", "service"]`). `health.*`, `report.*` and `ssm-get.sh` stay in `templates/app/deploy/` for now (see choice 2).
4. **SSM.** The `@required` tag (already used by `shared-ai`) becomes the shared rule: a key without it warns and keeps the `.env` value; a key with it aborts the deploy. `shared-auth`'s `.env.example` gets `@required` on its keys, which preserves its current abort behavior.
5. **Backend skeleton for services.** `Dockerfile`, `.npmrc`, `tsconfig.json` come from the same templates as the apps, with `EXPOSE {{project.ports.api}}` and `CMD {{deploy.cmd}}` as variables (the `exec` fix included). `templates/app/backend/` belongs to lane-2, so that part needs their go-ahead before it is touched.
6. **`sync.config.json`.** Remove `deploy/**` from the service profile's `neverTouch`, and `backend/Dockerfile`, `backend/.npmrc`, `backend/tsconfig.json` once step 5 lands. `backend/src/**`, `compose.yaml`, `README.md`, `.env.example` stay project-owned.
7. **Tests.** `scripts/test/deploy-templates.test.mjs` renders the service profile for both services and asserts the rollback branch, the pruning loop, the lock timeout and the health port; the sync snapshot is updated; `standards-check` already covers the compose contract (#695) for the `app` profile, and the same rules apply to services once their compose files follow it.

## Rollout

1. Implementation PR in this repo (registry, `buildVars`, templates, tests, snapshot). Run `npm run sync:preview` and confirm `deploy/` appears for both services.
2. `sync.yml` opens a sync PR in `shared-auth` and in `shared-ai`. Review each, delete the hand copies the PR replaces, add `@required` tags, merge after CI.
3. On the server, `autodeploy.service` copies `deploy/autodeploy.sh` to `/tmp` on every run and executes the copy, which fast-forwards the checkout and then calls `deploy/deploy.sh --no-pull`. The run that picks up the sync PR therefore executes the old `autodeploy.sh` against the new checkout, and a `deploy.sh` that the PR deleted would break that one run. Keep `deploy/deploy.sh` as a one-line wrapper (`exec bash deploy/remote-deploy.sh deploy "$(git rev-parse HEAD)"`) for one release. Later runs use the new `autodeploy.sh` automatically. The installed systemd units only need `deploy/install-autodeploy.sh` (a user step) if the unit text changes, which a rename-only diff does not.
4. Verification of the rollback on the server (a deploy whose health check fails) is not done by the agent: it is a production action. The user or a later session runs it once and records the result in #696.

## Risks

- A mistake in the shared script affects the sign-in service for all 8 apps. The change reaches the services only through the two sync PRs, which are reviewed one at a time, `shared-ai` first (it is called by the apps, not needed to sign in).
- A deploy that moves the web port variable (`WEB_BIND`/`WEB_PORT`) must keep the published port unchanged: both services already publish `${WEB_BIND:-127.0.0.1}:${WEB_PORT:-81xx}`.

## Open choices

1. **One script or two.** Option 1 (recommended): one `remote-deploy.sh` with run-time branches, as above. Option 2: a separate `templates/service/deploy/deploy.sh.tmpl` that copies the rollback, pruning and lock code from the app script. Option 2 is simpler to review but repeats the code that caused the drift.
2. **Do the services get `health.*`, `report.*` and `ssm-get.sh`?** Recommended: `ssm-get.sh` yes (it replaces the inline reader), `health.*` and `report.*` no until the service logs follow ADR-0021.
3. **`@required` for apps.** Recommended: yes, same meaning everywhere.
4. **Lane-2's go-ahead** for the shared backend skeleton in step 5, or leave `Dockerfile`/`.npmrc`/`tsconfig.json` to a follow-up issue.

## Tests

`npm run check:docs` (docs-only change); CI runs `npm run check`.
