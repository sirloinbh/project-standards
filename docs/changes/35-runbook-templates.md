# #35 Deploy and operations document templates (deploy runbook, daily log, backup and restore)

## Change

| File | Content |
|---|---|
| `docs/runbooks/deploy.md` | Generalized workout-memo `docs/deployment.md`. App-specific values are `{{project.*}}`, and the server `.env` is described only as a table of key names and where they are created (`NODE_AUTH_TOKEN` added) |
| `docs/runbooks/backup-restore.md` | Split the backup and restore steps out of the deploy document, and added deleting the temporary DB after verifying a restore and a Terraform check after a full server recovery |
| `docs/runbooks/daily.md`, `next-steps.md` | Moved workout-memo's daily log and next-steps rules, and defined the dated file format and a "user to-do" section |
| `docs/runbooks/README.md` | How to use them, why they are not synced, and a comparison table with the workout-memo documents |
| `scripts/test/runbooks.test.mjs` | Checks that every template renders without blanks for every registry project, and that server `.env` keys have no values |

## Decisions

- **Not synced.** Operations documents carry per-app cost tables and operating history, so overwriting them with full management (full) is wrong. The scaffold (#85) copies them once for a new app.
- The server name prefix (timer, lock, backup folder, AWS profile) is set from `project.db.name`. workout-memo's `workout-` is the same as the DB name, so there is nothing to change.

## Checks

- `npm run check` passed.
