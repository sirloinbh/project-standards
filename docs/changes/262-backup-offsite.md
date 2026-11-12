# #262 Keep DB backups off the server and check restores regularly

## Current state checked (read-only)

- A daily DB dump existed only for workout-memo (a cron in `user-data.sh` of shared-aws-infrastructure). The other 7 apps dumped only at deploy time, while the backup runbook template said "every day at 03:30" for each app.
- The only copy off the server was the Lightsail automatic snapshot (daily, 7 kept).
- There was no schedule for restore checks.

## Decision

The user chose **S3** as the off-server location (2026-10-27, comparison in a #262 comment).

## Change

| File | Content |
|---|---|
| `templates/app/deploy/backup.sh.tmpl` | `dump [label]`: `pg_dump --no-owner`, a row count file, 14-day cleanup, S3 upload (`curl --aws-sigv4`, key via standard input). `verify`: restore the latest dump into a temporary postgres and compare row counts |
| `templates/app/deploy/backup.{service,timer}.tmpl` | Daily dump at 03:30 (Seoul) |
| `templates/app/deploy/restore-check.{service,timer}.tmpl` | Weekly restore check on Sunday at 04:30 (Seoul) |
| `templates/app/deploy/install-backup.sh.tmpl` | Installs the server folder and timers, replaces the old cron dump (`/etc/cron.d/<DB>-backup`) |
| `templates/app/deploy/remote-deploy.sh.tmpl` | The pre-deploy dump also uses `backup.sh dump predeploy`. If only S3 fails (exit code 3), the deploy continues |
| `scripts/test/deploy-templates.test.mjs` | File list, dump, S3, and restore check behavior with fake docker, curl, and flock, and timer times |
| `docs/runbooks/backup-restore.md`, `docs/runbooks/deploy.md` | Actual behavior and the S3 keys (`BACKUP_*`) |
| `docs/adr/0009-multi-app-single-lightsail.md` | Addendum: a daily dump per app, S3, and a weekly restore check |

The S3 bucket and the upload-only IAM user are created in sirloinbh/shared-aws-infrastructure#7.

## User steps

1. Merge the shared-aws-infrastructure#7 PR, run `terraform apply`, and create the upload-only access key
2. Put the `BACKUP_*` keys into each app's `.env` on the server and run `sudo bash /opt/<app>/deploy/install-backup.sh`
3. Check the S3 upload with `bash /opt/<app>/deploy/backup.sh dump` (the real S3 upload can be checked only on the server)

## Verification

- `node --test scripts/test/deploy-templates.test.mjs`: 12 of 13 passed, 1 skipped (no python3, an existing test)
- `npm run check`: see the PR body
