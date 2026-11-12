# #36 Create deploy script templates

## Change

| File | Content |
|---|---|
| 5 files in `templates/app/deploy/` | Generalized workout-memo `deploy/` as ADR-0009 says: `autodeploy.sh`, `remote-deploy.sh`, `install-autodeploy.sh`, `autodeploy.service`, `autodeploy.timer`. The repo name, `/opt/<app>`, image names, backup command, timer name, start time, and default web port are filled in from registry values |
| `scripts/lib/render.mjs` | Also adds the "중앙 관리 파일" header (central managed file; `#`) to `.service` and `.timer` |
| `docs/runbooks/deploy.md` | Documents the shared lock, the server web port (`WEB_PORT`), the timer start time, the timer install command, and the `compose.yaml` requirements of the deploy scripts |
| `docs/adr/0009-multi-app-single-lightsail.md` | Supplement section: timer name (`<DB name>-autodeploy`), start time, health port, pre-deploy dump |
| `scripts/test/deploy-templates.test.mjs` | Rendering of the 8 apps, keeping the workout-memo production server names, the shared lock, per-slot start times, `{{.Tag}}` preserved, `bash -n`, CI verdict |
| `scripts/test/render.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | Header extension check, 5 deploy files added per app |

## What was decided

- **workout-memo syncs without changing its server.** The timer name `workout-autodeploy`, the backup command `/usr/local/bin/workout-backup`, and the image names `workout-backend` and `workout-frontend` are the same as now. The health port reads `WEB_PORT` from the server `.env` (currently 80).
- **One thing changes: the lock file.** It uses `/run/lock/apps-deploy.lock` instead of `/run/lock/workout-deploy.lock`. Manual deploys and the timer use the same new lock, so they do not overlap.
- **File names are the same regardless of the app.** The renderer cannot use variables in file names. So `install-autodeploy.sh` installs `deploy/autodeploy.service` as `/etc/systemd/system/<DB name>-autodeploy.service`. Sync does not delete workout-memo's existing `deploy/workout-autodeploy.*` files, so whether to delete them is decided in the first sync PR (#97).
- **docker `--format '{{.Tag}}'`** is read as a variable by the renderer, so it is written split as `'{''{.Tag}}'`. A test checks that it joins back into `{{.Tag}}` in bash.
- The `compose.yaml` of the other 7 apps does not yet have the image names or the `WEB_BIND` and `WEB_PORT` variables. Even after this script arrives through sync, it does not run until the timer is installed on the server. When deploying an app, align compose in each repo (requirements in chapter 4 of `docs/runbooks/deploy.md`).
- `scripts/deploy.ps1`, which runs on the PC, is not in the scope of this issue (`deploy/*`).

## Checks

- `node --test scripts/test/deploy-templates.test.mjs`: 6 of 7 passed, 1 skipped. The CI verdict check was skipped on this PC because `python3` is missing, and it runs on CI (ubuntu). On this PC, I connected a real Python to the rendered `autodeploy.sh ci-state` and confirmed that 5 inputs (none, running, success·skipped·neutral, containing a failure, cancelled) give pending, pending, pass, fail, fail.
- `bash -n`: all 3 rendered `.sh` files of the 8 apps passed.
- `UPDATE_SNAPSHOT=1 npm test`: 398 of 400 passed, 2 skipped.
- No real server deploy was done.
