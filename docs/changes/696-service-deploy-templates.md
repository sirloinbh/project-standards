# 696: render the service deploy files from the shared deploy templates

Implements the design in [696-service-deploy-templates-design.md](696-service-deploy-templates-design.md) with the user's decisions of 2026-11-19: one shared `remote-deploy.sh` for apps and services, services get only `ssm-get.sh` from the app-only files, apps follow `@required`, and the shared backend skeleton is a follow-up (#758).

## What changed

- **New folder `templates/deploy/deploy/`.** The 13 deploy files that apps and services share moved here with `git mv`: `autodeploy.*`, `backup.*`, `restore-check.*`, `install-autodeploy.sh`, `install-backup.sh`, `notify.sh`, `remote-deploy.sh`, `ssm-get.sh`. `health.*` and `report.*` stay in `templates/app/deploy/`. The `app` profile is now `["common", "deploy", "app"]` and the `service` profile `["common", "deploy", "service"]`. The rendered app files are unchanged except where this document says otherwise.
- **Registry.** Each `sharedServices` entry gets `title` and `db.name` (`auth`, `ai`), so the templates read the same fields for an app and a service. The schema requires them.
- **`scripts/lib/vars.mjs`.** `buildVars` fills `project` for a service target from `sharedServices` and adds `project.deploy` for every target: `unit` (the systemd unit prefix: an app's DB name, a service's own name, as already installed on the server), `units` (the timers `install-backup.sh` installs: the services have no health or report timer), `images` (pruned after a deploy), and `migrate` (`step` for apps, `image` for services). `sync-plan.mjs` keeps the manifest `registry` block for app targets only.
- **`remote-deploy.sh`.** Migrations run as a deploy step only when `migrate` is `step`; the services' image runs them when it starts. A project may ship `deploy/bootstrap-env.sh` to create `.env` on the first deploy (a project-owned file, not synced). A key tagged `@required` in `.env.example` must be readable from SSM or the deploy stops; other keys still warn and keep the `.env` value. Without an SSM key pair only a required key is a problem.
- **`backup.sh`.** The database container is found by its compose labels instead of `docker compose exec`. A service's `compose.yaml` requires secrets that only the deploy reads from SSM, so `docker compose` fails under the systemd timer. For apps this is the same container as before.
- **`templates/service/deploy/deploy.sh.tmpl`.** A one-line wrapper for one release: an `autodeploy.sh` copy that started before the update still calls `deploy/deploy.sh --no-pull`.
- **`sync.config.json`.** `deploy/**` leaves the service profile's `neverTouch`. `backend/**` stays (the skeleton is #758).
- **Tests.** `scripts/test/service-deploy-templates.test.mjs` (new): files, names, rollback, pruning, lock timeout, label lookup, `bash -n`, and the `@required` behavior. `deploy-templates.test.mjs`: the backup harness uses the new container lookup and runs the script from a file (a long command line with many quotes breaks under Windows argument quoting).

## What the services receive (sync preview, compared with the hand copies)

`npm run sync:preview`, `shared-auth` and `shared-ai` against their current `deploy/`:

| File | Change in behavior |
|---|---|
| `autodeploy.sh` | Detaches HEAD at the CI-passed commit and runs `remote-deploy.sh deploy <sha>`; before it merged `--ff-only` and ran `deploy.sh --no-pull`. Same CI checks, lock and `.deployed` / `.autodeploy-failed` files |
| `remote-deploy.sh` (new) | **Rollback**: a failed health check starts the previous images again (the hand copy left the broken containers running). Lock wait times out after 30 minutes with exit 4 (the hand copy waited forever). Old images and the builder cache are pruned. SSM reads through `deploy/ssm-get.sh` |
| `deploy.sh` | Now the wrapper described above |
| `backup.sh` | Container found by label. The audit-log prune is a no-op for the services (no `audit_log` table). Everything else is the same dump, count and S3 steps |
| `notify.sh`, `ssm-get.sh` | `notify.sh` also knows the `health` and `report` checks, which the services do not use. `ssm-get.sh` replaces the inline reader |
| units, timers, `install-*.sh` | Names are unchanged (`shared-auth-autodeploy`, `/var/backups/auth`, boot delay 4 min 40 s). Comments differ; `install-backup.sh` also removes a leftover `/etc/cron.d/<unit>-backup` |
| `.env` bootstrap | The hand `deploy.sh` created `.env` (DB password, URLs). That moves to a project-owned `deploy/bootstrap-env.sh`, which the sync PR in each service must add before the first deploy that needs it (the servers already have `.env`) |
| SSM keys | `shared-auth` keys are all `@required` in `.env.example`, so the abort-on-failure behavior is kept. `shared-ai` keeps its own `@required` tags |

## Rollout

1. Merge this PR. `sync.yml` opens a sync PR in `shared-auth` and in `shared-ai`. They change runtime behavior of the sign-in service, so they are not merged by the agent: the coordinator relays them to the user, `shared-ai` first.
2. In each sync PR, add `deploy/bootstrap-env.sh` (the hand `.env` creation) as a separate commit that does not start with `chore: sync central standards (project-standards@`, and delete nothing else by hand.
3. The server rollback test (a deploy whose health check fails) is a user step; record the result in #696.

### Rollout result (2026-11-19)

- **shared-ai (canary):** installed first from the runbook in the shared-ai README ("Server deploy"). First deploy `a83a85fe44a4`, then sync PR #13 (the pulling wrapper) deployed by autodeploy at 21:36 KST as `b8ecc53c163e`: `.deployed` equals HEAD, api recreated, db healthy, public `/api/health` ok.
- **shared-auth:** sync PR #16 plus `deploy/bootstrap-env.sh` (commit 0707003) merged 12:23Z (21:23 KST); autodeploy deployed `dec1d9d7cac7` at 21:28 KST on its own. The first silent runs were the CI-pending wait (no journal line, see #808). Sign-in stayed up throughout: `auth.daysofme.com/api/health` 200 and an app's `/api/me` 401 when signed out on every sample.
- **Not done:** the server rollback test (step 3 above) is still a user step.

## Tests

`npm run check` (the full check), including the sync snapshot.
