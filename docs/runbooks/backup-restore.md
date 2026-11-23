# Backup and restore ({{project.title}})

## Backup types

| Type | Time (Seoul) | Location | Retention |
|---|---|---|---|
| Lightsail automatic snapshot | Daily 03:00 | AWS (whole server) | Latest 7 |
| DB dump | Daily 03:30 (`{{project.db.name}}-backup.timer`) | Server `/var/backups/{{project.db.name}}/{{project.db.name}}-<date>.sql.gz` and a row-count file `.counts` | 14 days |
| Pre-deploy DB dump | Every deploy | Same folder, name ends in `-predeploy` | 14 days |
| Off-server copy | Every dump | S3 `s3://<bucket>/{{project.name}}/` (when the server `.env` has a bucket) | 30 days (bucket lifecycle) |
| `audit_log` rows ([audit-log.md](../audit-log.md)) | Deleted by the daily DB dump, after the dump | App DB | 365 days in the DB, then 14 more in the dumps |
| Restore check | Every Sunday 04:30 (`{{project.db.name}}-restore-check.timer`) | Restores the latest dump into a temporary DB and compares row counts | Log only |
| Local DB backup | When needed | PC `backups/` (excluded from git) | Managed by the user |

- One-time setup: `sudo bash /opt/{{project.name}}/deploy/install-backup.sh` (installs 2 timers. If an old cron dump exists, it is replaced by the timer)
- Run history: `journalctl -u {{project.db.name}}-backup`, `journalctl -u {{project.db.name}}-restore-check`
- Manual dump: on the server, `bash /opt/{{project.name}}/deploy/backup.sh dump`
- Manual restore check: `bash /opt/{{project.name}}/deploy/backup.sh verify`
- Before installation, dumps are created in the app folder's `backups/` (excluded from git).
- Local DB backup: `./scripts/backup.ps1` (local DB `127.0.0.1:{{project.ports.db}}`)

## S3 copy [User]

The S3 bucket and the upload-only key are created by shared-aws-infrastructure. The key can only **upload** files to the bucket, so even if it leaks it cannot read or delete backups. Even if a file is overwritten under the same name, the bucket's versioning keeps the old file.

If you put the keys below in the server's shared file `/opt/project-standards/.env`, every app's backups are uploaded from the next dump on (ADR-0010). A value in an app `.env` is used only when it is missing from the shared file. Enter values only on the server and never leave them in chat or documents.

| Key | Value |
|---|---|
| `BACKUP_S3_BUCKET` | Bucket name (output value of shared-aws-infrastructure) |
| `BACKUP_S3_REGION` | `ap-northeast-2` if left empty |
| `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY` | Upload-only key (secret values) |

The upload uses `curl --aws-sigv4` on the server, and the key is passed through standard input, not the command line. If the key is missing or the upload fails, the local dump is kept and only the timer is marked as failed. Deployment is not stopped.

Download from S3 (PC, personal AWS profile):

```powershell
aws s3 ls s3://<bucket>/{{project.name}}/ --profile {{project.db.name}}-personal
aws s3 cp s3://<bucket>/{{project.name}}/<file> ./backups/ --profile {{project.db.name}}-personal
```

## Quarterly drill [User]

The weekly restore check proves that the newest **local** dump restores. It does not prove that the off-server S3 copy can be downloaded and restored. On the first day of January, April, July and October the central `restore-drill` workflow opens one issue, "Quarterly restore drill <year>-Q<n>", with one checkbox for every app and shared service that has a database. Do the steps below for each item (personal AWS profile, Docker on the PC), write the result on the item, and fix this runbook where a step was wrong.

```powershell
# 1. Newest file and its row counts (the .counts file is uploaded with every dump)
aws s3 ls s3://<bucket>/{{project.name}}/ --profile {{project.db.name}}-personal
aws s3 cp s3://<bucket>/{{project.name}}/<file>.sql.gz ./backups/ --profile {{project.db.name}}-personal
aws s3 cp s3://<bucket>/{{project.name}}/<file>.counts ./backups/ --profile {{project.db.name}}-personal
# 2. Scratch database (the same image as production, see versions.json)
docker run -d --rm --name drill-{{project.name}} -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=restore_check postgres:17-alpine
# 3. Restore and time it
Measure-Command { gunzip -c ./backups/<file>.sql.gz | docker exec -i drill-{{project.name}} psql -q -v ON_ERROR_STOP=1 -U postgres -d restore_check }
# 4. Row counts for the comparison: the same query as backup.sh (COUNT_SQL), then compare with the .counts file
docker exec drill-{{project.name}} psql -At -U postgres -d restore_check -c "select table_schema || '.' || table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') and table_type = 'BASE TABLE' order by 1" > ./backups/restored.counts
# 5. Clean up: the dump holds personal data
docker rm -f drill-{{project.name}}
Remove-Item ./backups/<file>.sql.gz, ./backups/<file>.counts, ./backups/restored.counts
```

Compare `restored.counts` with the downloaded `.counts` file (they must be identical). If `gunzip` is not on the PC, use `7z` or `tar -xzOf`. A dump with no `.counts` file in S3 is a finding: open an issue, because `backup.sh dump` uploads both.

`node scripts/restore-drill.mjs --dry-run` in the central repo prints the issue body that the next quarter will open.

## Copying to a PC

```powershell
scp -i ~/.ssh/{{project.name}}-lightsail "ubuntu@$(server-ip):/var/backups/{{project.db.name}}/<file>" ./backups/
```

## Restore check (into a separate DB)

`{{project.db.name}}-restore-check.timer` does this automatically every week (it restores the latest dump into a temporary postgres container and compares it with the per-table row counts saved at dump time). Before a large migration, check it yourself as follows.

```bash
cd /opt/{{project.name}}
docker compose exec -T db createdb -U {{project.db.name}} {{project.db.name}}_restore
gunzip -c /var/backups/{{project.db.name}}/<file> | docker compose exec -T db psql -q -U {{project.db.name}} -d {{project.db.name}}_restore -v ON_ERROR_STOP=1
docker compose exec -T db psql -U {{project.db.name}} -d {{project.db.name}}_restore -c 'select count(*) from schema_migrations'
docker compose exec -T db dropdb -U {{project.db.name}} {{project.db.name}}_restore
```

## Replace the production DB with a dump [User]

This cannot be undone. First make a dump of the current state.

1. `bash /opt/{{project.name}}/deploy/backup.sh dump`
2. `docker compose stop api web`
3. Drop and recreate the `{{project.db.name}}` DB, then restore into it by using `-d {{project.db.name}}` in the restore command above.
4. `docker compose start api web`, then `curl -fsS http://127.0.0.1:{{project.ports.web}}/api/health`

## Full server recovery [User]

In the Lightsail console, create a new instance from a snapshot and move the static IP. This differs from the Terraform state, so after recovery check the difference with `terraform plan` and decide whether to run `terraform import`.
