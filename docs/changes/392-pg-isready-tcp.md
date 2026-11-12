# #392 Stop `pg_isready` from mistaking the first-run temporary server for ready

Found in the review of `sirloinbh/plan-routine` PR #81. On the first run with an empty volume, the official postgres image creates the DB and runs the init scripts with a temporary server that has TCP turned off (`listen_addresses=''`). `pg_isready` checks the unix socket by default, so it answers ready during this period too.

## Change

| File | Content |
|---|---|
| `scaffold/app/compose.yaml` | Changed the DB health check to `pg_isready -h 127.0.0.1 ...`. The app container does not connect to `db:5432` during the temporary server period and get refused |
| `templates/app/deploy/backup.sh.tmpl` | The wait loop of the restore check (`verify`) also checks with `-h 127.0.0.1`. It does not start the restore during the temporary server period and fail falsely |
| `scripts/test/scaffold.test.mjs`, `scripts/test/deploy-templates.test.mjs` | Check that both commands have `-h 127.0.0.1` |

## Sync

- `backup.sh` is a centrally managed file, so it reaches apps through the sync PR.
- `compose.yaml` is a scaffold file, so it is not synced. Apps that already exist fix it themselves. plan-routine fixed it in PR #81.

## Left as is

- The 3 CI service containers in `.github/workflows/reusable-app-ci.yml` also use `--health-cmd pg_isready`, the same structure. It is outside the scope of the issue, so I did not fix it. There are no init scripts, so the temporary server period is short, but if needed it can be handled in a separate issue.

## Checks

- Real check (Docker 29.9.2, `postgres:17-alpine`): put an init script that takes 6 seconds on an empty volume, and ran both commands every 0.2 seconds.
  - Socket (no `-h`): answered ready right after the temporary server came up.
  - TCP (`-h 127.0.0.1`): answered ready after about 7 seconds, only after `PostgreSQL init process complete` in the log and the main server opened `0.0.0.0:5432`.
- `node --test scripts/test/scaffold.test.mjs scripts/test/deploy-templates.test.mjs`: passed.
- `npm run check`: passed (518 of 523 tests passed, 0 failed, 5 skipped; tests that are skipped depending on the environment).
