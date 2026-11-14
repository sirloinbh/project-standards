# Deployment and operations ({{project.title}})

It runs on a single personal-account Lightsail server with Docker Compose (web, API, PostgreSQL). All 8 apps run on the same server, each with its own compose ([ADR-0009](https://github.com/sirloinbh/project-standards/blob/main/docs/adr/0009-multi-app-single-lightsail.md)). Access is possible only from allowed IPs.

## Value summary

| Item | Value |
|---|---|
| Server app folder | `/opt/{{project.name}}` |
| Local web / DB ports | `127.0.0.1:{{project.ports.web}}` / `127.0.0.1:{{project.ports.db}}` |
| Server web | `0.0.0.0:{{project.ports.web}}` (`WEB_BIND` and `WEB_PORT` in the server `.env`. The deploy script also checks health on this `WEB_PORT`) |
| DB name | `{{project.db.name}}` |
| Auto-deploy timer | `{{project.db.name}}-autodeploy.timer` (starts at `3min {{project.slot}}0s` after boot, then every 2 minutes) |
| Deploy lock | `/run/lock/apps-deploy.lock` (shared by every app on the server. Only one app builds and deploys at a time) |
| AWS CLI profile | `{{project.db.name}}-personal` (personal account, separate from the company profile) |
| SSH key | `~/.ssh/{{project.name}}-lightsail` (kept only on the PC) |

## Server `.env` keys

Create the values only on the server and never leave them in the repository, chat, or logs. When you add a key, update `.env.example`, the code that uses it, and this table in the same PR ([environment variable rules](https://github.com/sirloinbh/project-standards/blob/main/docs/env-conventions.md)).

| Key | Where it is created | Description |
|---|---|---|
| `POSTGRES_DB` | user-data (first boot) | `{{project.db.name}}` |
| `POSTGRES_USER` | user-data | `{{project.db.name}}` |
| `POSTGRES_PASSWORD` | user-data (generated randomly on the server) | Secret value. Never take it off the server |
| `WEB_BIND` | user-data | `0.0.0.0` |
| `WEB_PORT` | user-data | `{{project.ports.web}}`. This port must be open in the firewall (shared-aws-infrastructure) |
| `NODE_AUTH_TOKEN` | [User] enter directly | Classic PAT for reading GitHub Packages (`read:packages` only). Secret value |
| `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION` | [User] enter in the shared file | Bucket and region for the S3 copy of DB dumps. If absent, backups stay only on the server ([Backup and restore](backup-restore.md)) |
| `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY` | [User] enter in the shared file | Upload-only key for the bucket. Secret value |
| `SECRETS_AWS_ACCESS_KEY_ID`, `SECRETS_AWS_SECRET_ACCESS_KEY` | [User] enter in the shared file | A key that can read only `/sirloinbh/shared/*` and `/sirloinbh/<app>/*` in SSM. Secret value. If present, the deploy script reads every key that `.env.example` tags with `@ssm=` (and `ANTHROPIC_API_KEY` for apps that use the Claude API) from SSM on every deploy and passes it to the app ([ADR-0010](https://github.com/sirloinbh/project-standards/blob/main/docs/adr/0010-claude-api-key-ssm.md), [ADR-0014](https://github.com/sirloinbh/project-standards/blob/main/docs/adr/0014-app-secrets-ssm-paths.md)). With this key in place, those keys can be removed from the server `.env` |
| `HEALTHCHECK_URL_HEALTH`, `HEALTHCHECK_URL_DEPLOY`, `HEALTHCHECK_URL_BACKUP`, `HEALTHCHECK_URL_RESTORE`, `HEALTHCHECK_URL_REPORT` | [User] enter directly | Per-check ping URLs from healthchecks.io. The URL contains a secret UUID, so treat it as a secret value. No ping is sent for a key that is absent (see "Alerts" below) |

`IMAGE_TAG` is decided by the deploy script from the commit, so do not put it in `.env`.

The "shared file" is the single file `/opt/project-standards/.env` on the server (ADR-0010). Instead of putting the AWS keys that every app shares (`BACKUP_*`, `SECRETS_AWS_*`) into each app, keep them here once. Create it once at the start:

```bash
sudo install -d -o ubuntu -g ubuntu -m 700 /opt/project-standards
install -m 600 /dev/null /opt/project-standards/.env   # then put the keys in with an editor
```

Scripts read the shared file first, and read the app `.env` only when a key is missing.

## 1. One-time setup [User]

1. **AWS CLI profile**
   ```powershell
   aws configure --profile {{project.db.name}}-personal
   aws sts get-caller-identity --profile {{project.db.name}}-personal   # confirm it is the personal account ID
   ```
2. **SSH key**
   ```powershell
   ssh-keygen -t ed25519 -f $HOME/.ssh/{{project.name}}-lightsail -C {{project.name}}
   ```
3. **Variables file:** copy `infrastructure/terraform.tfvars.example` to `infrastructure/terraform.tfvars` and fill in `aws_profile`, `expected_account_id`, `allowed_cidrs`, and `budget_emails`. This file and `terraform.tfstate` are excluded from git.

## 2. Apply the infrastructure [User]

```powershell
cd infrastructure
terraform init
terraform plan -out=deploy.tfplan     # check the list of resources to create and the account
terraform apply deploy.tfplan
terraform output                      # static_ip, url, ssh
```

- On first boot, user-data sets up swap, Docker, the repository clone, the server `.env`, the backup cron, and the auto-deploy timer.
- If you lose the state, Terraform can no longer manage the resources, so back it up separately in a safe place off the PC.

## 3. App deploy and rollback

```powershell
./scripts/deploy.ps1 -Server <static_ip> -Ref origin/main   # deploy
./scripts/deploy.ps1 -Server <static_ip> -Rollback          # return to the previous deploy
```

Deploy order (`deploy/remote-deploy.sh`):

1. Wait until server initialization finishes (`cloud-init status --wait`).
2. Fetch and check out the ref, and build images tagged with the commit (12 characters).
3. If there is a previous deploy, make a DB dump first.
4. Apply migrations (recorded in `schema_migrations`).
5. Start everything and check `http://127.0.0.1:<WEB_PORT>/api/health` for up to 60 seconds.
6. If health fails, restart with the previous images and finish as a failure.
7. On success, record `.deployed` and `.previous` and keep only the current and previous images.

- A rollback does not rebuild. Migrations are not reverted, so if you need to roll data back, restore from the dump taken just before the deploy ([Backup and restore](backup-restore.md)).

## 4. Auto deploy from main

When a change is merged to main, the server checks `origin/main` every 2 minutes, and if all GitHub Actions workflow runs for that commit succeeded, it deploys in the order of step 3. Runs that GitHub itself starts (Dependabot updates and the CodeQL default setup, where the API `event` is `dynamic`) are not counted in the result (#417). CodeQL alerts are viewed separately in code scanning. No AWS or SSH keys are kept on GitHub. If another app is deploying (shared lock), it checks again on the next round.

The deploy scripts (`deploy/`) are central templates, and they work only if this repo's `compose.yaml` meets the following conditions.

- Image names: `{{project.db.name}}-backend:${IMAGE_TAG:-local}`, `{{project.db.name}}-frontend:${IMAGE_TAG:-local}`
- Web port: `'${WEB_BIND:-127.0.0.1}:${WEB_PORT:-{{project.ports.web}}}:80'`
- DB service named `db`, API service named `api`, and `node dist/migrate.js` inside the API image

Install the timer (once, on the server):

```bash
sudo bash /opt/{{project.name}}/deploy/install-autodeploy.sh
```

```bash
systemctl list-timers {{project.db.name}}-autodeploy.timer        # next run time
journalctl -u {{project.db.name}}-autodeploy -n 50 --no-pager     # recent log
cat /opt/{{project.name}}/.deployed                                # deployed commit
sudo systemctl stop {{project.db.name}}-autodeploy.timer           # pause
sudo systemctl start {{project.db.name}}-autodeploy.timer          # resume
rm /opt/{{project.name}}/.autodeploy-failed                        # retry a skipped commit
```

## 4-1. Alerts (healthchecks.io)

The firewall is open only to allowed IPs, so an outside monitoring service cannot reach the server. So the server sends pings outward, and healthchecks.io sends an email if pings stop or a failure ping arrives (#284). Even if the whole server stops, the pings stop, so you will know.

| Check | Server `.env` key | Where the ping is sent from | healthchecks.io period / grace |
|---|---|---|---|
| health | `HEALTHCHECK_URL_HEALTH` | `{{project.db.name}}-health.timer` every 5 minutes, `/api/health` | 5 minutes / 10 minutes |
| deploy | `HEALTHCHECK_URL_DEPLOY` | Auto deploy every 2 minutes (up to date, waiting for CI, and deploy success are ok; CI or deploy failure is fail) | 2 minutes / 10 minutes |
| backup | `HEALTHCHECK_URL_BACKUP` | Daily dump (an S3 copy failure is also fail) | 1 day / 2 hours |
| restore | `HEALTHCHECK_URL_RESTORE` | Weekly restore check | 7 days / 1 day |
| report | `HEALTHCHECK_URL_REPORT` | Daily server status report (#285) | 1 day / 2 hours |

- Install: `sudo bash /opt/{{project.name}}/deploy/install-backup.sh` (backup, restore check, and health timers). You do not need to run it again if you add the URLs to `.env` later.
- Manual check: `bash /opt/{{project.name}}/deploy/notify.sh health` (the URL is not printed)
- Daily report (#285, 04:00): one line, `memory=..% disk=..% deployed=<commit> containers: <container> <memory>`, is left in the report check's log. If server memory usage exceeds `REPORT_MEMORY_PERCENT` (default 85) or disk usage exceeds `REPORT_DISK_PERCENT` (default 90), it is sent as a failure ping and an email arrives. To see only the current values, run `bash /opt/{{project.name}}/deploy/report.sh line`.
- The ping body (dump name, failure reason) is left in the check's log on healthchecks.io. Do not put secret values in it.

## 4-2. API rate limiting

The nginx in the web container (`frontend/nginx.conf`, a centrally managed file) limits `/api/` requests to an average of 10 per second per client IP. Up to 40 at once pass immediately, and requests beyond that receive `429` (#291). The API server itself has no limit.

- Normal use (one screen calling several APIs at the same time) does not hit it. If you see a 429 on a screen, first check whether that screen calls the API repeatedly.
- If you later put a reverse proxy in front of the server (domain work #251), every request will appear to come from the proxy IP. At that point, add a `real_ip` setting (use the real IP the proxy passes on) to nginx as well.

## 5. Access

- **Browser:** `http://<static_ip>:<WEB_PORT>` (from allowed IPs only)
- **SSH:** `ssh -i ~/.ssh/{{project.name}}-lightsail ubuntu@<static_ip>`
- **SSH tunnel (encrypted transport):** `ssh -i ~/.ssh/{{project.name}}-lightsail -L {{project.ports.web}}:127.0.0.1:<WEB_PORT> ubuntu@<static_ip>`, then `http://localhost:{{project.ports.web}}`
- **Logs:** on the server, `cd /opt/{{project.name}} && docker compose logs --tail 100 api`

## 6. Changing the allowed IPs

Edit `allowed_cidrs` in `terraform.tfvars`, then run `terraform apply`. Opening to everyone (`/0`) is rejected by variable validation.

## 7. Teardown [User]

After bringing the backups you need to the PC, run `terraform destroy`. Automatic snapshots remain after the instance is deleted and can incur costs, so check in the Lightsail console.
