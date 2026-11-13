# #432 Check PostgreSQL readiness over TCP in the shared app CI

## Problem

The 3 PostgreSQL service containers in `.github/workflows/reusable-app-ci.yml` used `--health-cmd pg_isready`. Without `-h`, `pg_isready` checks the unix socket, so the first-run temporary server (TCP off) can be mistaken for ready. #392 (PR #429) fixed `compose.yaml` and the backup restore check but left these 3 places. No failure has been seen, because the app CI has no init scripts and the temporary server period is short. This is a preventive fix.

## Change

| File | Content |
|---|---|
| `.github/workflows/reusable-app-ci.yml` | In the 3 service containers, `--health-cmd` is now `"pg_isready -h 127.0.0.1 -U app"`. The command is double-quoted inside the `options:` string so it stays one argument. `app` matches `POSTGRES_USER` |

- No workflow test asserted the old text, so no test changed.
- The file is the source (not a copy), and no copy of it exists in this repo. Downstream repos call it as a reusable workflow, so they get the change without a sync PR.

## Checks

- `npm run check`: see the PR body.
- One app's CI run with the changed shared workflow: after merge, confirm in a downstream repo (listed in the issue's done condition).
