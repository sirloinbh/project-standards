# #1059 Quarterly restore drill from the S3 copy

- Issue: [#1059](https://github.com/sirloinbh/project-standards/issues/1059)
- Branch: `feat/1059-quarterly-restore-drill`
- Parent: #1051

## Changes — 2026-11-23

- `scripts/restore-drill.mjs`: builds the drill issue from `registry/projects.json` (every app and shared service with a database, 10 items today) and the postgres image of `versions.json`. `--dry-run` (default) prints it; `--apply` creates it with `gh` unless an issue with the same title ("Quarterly restore drill <year>-Q<n>") already exists, so a re-run does nothing. Labels: `type/chore`, `area/deploy`, `priority/P4`, `needs-user`.
- `.github/workflows/restore-drill.yml`: cron `0 0 1 1,4,7,10 *` (first day of each quarter) and a manual run whose `dry-run` input defaults to true. Permissions: `contents: read`, and `issues: write` on the job only.
- `docs/runbooks/backup-restore.md`: new "Quarterly drill" section (download the newest `.sql.gz` and `.counts` from S3 with the personal profile, restore into a scratch postgres container, time it, compare row counts, delete the files). The runbook reaches every app and shared service through sync.
- The drill itself stays a user step because it uses the personal AWS profile.

## Verification

- `node --test scripts/test/restore-drill.test.mjs`: 8 passed (quarters, registry reading, a checkbox per database, empty registry, create-once, dry run, workflow shape, runbook section).
- `node scripts/restore-drill.mjs --dry-run` prints the body with all 10 databases (the "dry run" of the done-when list). The scheduled run is verified by the first workflow run on 2027-01-01 or a manual run.
- `npm run check`: see the PR.
