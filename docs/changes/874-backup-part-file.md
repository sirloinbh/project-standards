# A failed backup dump leaves no `.part` file (#874)

`deploy/backup.sh dump` writes `pg_dump | gzip` to `<name>.sql.gz.part` and renames it after success. When `pg_dump` failed, `set -e` exited before the rename and the `.part` file stayed forever (the retention `find` never matched it), which made a disk-full failure worse.

- The exit handler `finish` now removes the unfinished file (`partial_file`) on any exit.
- The retention `find` also deletes `<db>-*.part` older than a day, for a script that was killed so the handler could not run.
- `scripts/test/deploy-backup.test.mjs`: a fake `docker` whose `pg_dump` fails leaves no file; an old `.part` is pruned and a fresh one is kept.

Verification: `node --test scripts/test/deploy-backup.test.mjs`, `npm run check`.
