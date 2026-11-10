# 0009. Deploy 8 apps to a single Lightsail instance with one compose per app

- Status: Accepted (issue #36)
- Date: 2026-10-23

> The "access" decision is superseded by [ADR-0012](0012-shared-domain-subdomains.md) (#248). Until the subdomain switch (#254) is finished, this document's per-app web port access continues to be used as is.

## Context

- Only workout-memo is deployed. A single 1 GB Lightsail instance runs Docker Compose (web, api, postgres), the server builds images itself, and `workout-autodeploy.timer` deploys `origin/main` that passed CI every 2 minutes. The firewall opens only 22 and 80 to allowed IPs.
- The other 7 apps are also to be put on the same server ([costs.md](../costs.md)). To build the deployment templates, the DB, access, and build approach must be decided first.
- `rootDomain` in `registry/platform.json` does not exist yet.
- The options compared are in the #36 comments. The user chose the recommended option as is (2026-10-23).

## Decision

| Item | Decision |
|---|---|
| App placement | Each app keeps its own repo in `/opt/<app name>` and runs with its own `compose.yaml` |
| DB | Each app has its own postgres container. A shared postgres is not used |
| Access | Open each app's web port (registry `ports.web`, 8101–8108) only to allowed IPs. When a domain exists, write a new ADR to switch to a host reverse proxy and subdomains |
| Image build | Build on the server as now. A server-wide shared lock (`/run/lock/apps-deploy.lock`) lets only one app build and deploy at a time |
| Auto deploy | One `<app name>-autodeploy.timer` per app. Start times are staggered slightly by slot |
| Server spec | Move to 2 GB (`small_3_0`) when the second app is put on |

## Consequences

- Migration, backup, and rollback are split per app. One app's failure does not reach another app's DB.
- 8 postgres instances run, which uses more memory than a shared postgres. Measure actual usage on 2 GB, and if it is not enough, raise to 4 GB or write a new ADR to switch to a shared postgres.
- There is no need to change the apps' frontend base path or API path. Adding app ports to the firewall is done in shared-aws-infrastructure.
- Because the server keeps building, it needs `NODE_AUTH_TOKEN` (`read:packages`) in the server `.env` to fetch the shared packages (design.md 4.3). There is no cost for an image registry such as ECR.
- Lightsail cannot change its spec in place. When moving to 2 GB, create a new instance from a snapshot and reattach the static IP. The user does this step.
- The deploy script templates (`templates/app/deploy/`) are built per this decision after #94.

## Addendum (2026-10-24, #36)

While building `templates/app/deploy/`, the following was decided.

- **The timer name is `<DB name>-autodeploy`** (for example `workout-autodeploy`, `study-autodeploy`). This differs from "`<app name>-autodeploy`" in the decision table. It was chosen so that sync works without renaming the timer on the running workout-memo server. DB names are also unique per app in the registry.
- **Timer start time:** It starts at `3min <slot>0s` after boot, then checks every 2 minutes. If the shared lock is already held, that round is skipped.
- **Health check port:** It follows `WEB_PORT` in the server `.env`, and uses the registry `ports.web` if there is no value. The workout-memo server currently has `WEB_PORT=80`, so behavior does not change. Moving to 8101 is done separately together with a firewall change.
- **Pre-deploy dump:** If the server has `/usr/local/bin/<DB name>-backup`, that command is used (workout-memo). If not, `pg_dump` saves to `backups/` in the app folder and deletes files older than 14 days.

## Addendum (2026-10-27, #262)

- **DB dumps are taken daily for every app.** The "pre-deploy dump" rule above changed. Previously only workout-memo was dumped daily by cron in the infrastructure user-data, and the other apps were dumped only at deploy time. Now `deploy/backup.sh` makes the daily dump (`<DB name>-backup.timer`, 03:30) and the pre-deploy dump in the same folder `/var/backups/<DB name>`. The apps take `/run/lock/apps-backup.lock` in turn.
- **The off-server copy is S3.** The user chose S3 (#262). The server holds a key that can only upload to the bucket, and uploads use `curl --aws-sigv4`, so the AWS CLI is not installed on the server. The bucket and key are created by shared-aws-infrastructure.
- **Restore is verified weekly.** `<DB name>-restore-check.timer` (Sunday 04:30) restores the latest dump into a temporary postgres container and compares it with the per-table row counts saved when the dump was taken.
