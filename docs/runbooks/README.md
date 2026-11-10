# Runbook templates

The format for an app repo's deployment and operations docs. They are based on the documents actually operated and verified in workout-memo (#35).

| Template | Where an app repo uses it | Contents |
|---|---|---|
| [deploy.md](deploy.md) | `docs/deployment.md` | Server values, server `.env` key names, infrastructure apply, deploy and rollback, auto deploy, access, teardown |
| [backup-restore.md](backup-restore.md) | `docs/backup-restore.md` | Backup types and retention, copying to a PC, restore check, replacing the production DB, full server recovery |
| [daily.md](daily.md) | `docs/daily/README.md` | Daily log rules and the date file format |
| [next-steps.md](next-steps.md) | `docs/next-steps/README.md` | Format of the next-steps document |

## How to use

- The `{{project.*}}` placeholders in a template are filled with that project's values from the [registry](../../registry/projects.json) (name, ports, DB name, and so on). They are filled by the same renderer as sync (`scripts/lib/render.mjs`), so a test checks that every active project renders with no blanks.
- **They are not synced.** Each app's runbooks carry a cost table, the server IP decision, and operating history, so central must not overwrite them. For a new app, the scaffold (#85) copies them once at the start; an existing app copies them when preparing for deployment and adapts them to the app.
- For the server `.env`, write only the key names and where they are created. Never write the values anywhere.
- Steps the user must do themselves are marked `[User]`.
- When you change a template, check whether the same change is needed in the docs of an app already in operation (currently workout-memo), and open an issue in that repo if it is.

## Differences from the workout-memo docs

workout-memo is the origin of these templates. The differences are listed below; there is no need to change the workout-memo docs to match the templates.

| Item | workout-memo | Template | Reason |
|---|---|---|---|
| Deployment doc location | One `docs/deployment.md` including backups | Split into `deployment.md` and `backup-restore.md` | Backup and recovery are procedures used even without deploying (local DB), so they are easier to find on their own |
| Cost table and pricing basis | Present | Absent | They change with the server setup and the time. The app writes its own when it starts operating |
| Server `.env` keys | Scattered through the text | Collected in one table, `NODE_AUTH_TOKEN` added | When using shared packages (GitHub Packages), the server build needs a read token ([design.md](../design.md) section 9) |
| Server name prefix | `workout-` (timer, lock, backup folder) | `{{project.db.name}}-` | workout-memo's prefix is the same as its DB name. Other apps follow the same rule |
| AWS CLI profile | `workout-personal` | `{{project.db.name}}-personal` | Same rule |
| Restore check | Leaves the temporary DB after checking | Drops it with `dropdb` after checking | Avoids growing the server disk and snapshot size |
| Full server recovery | Mentions only snapshot restore | Adds `terraform plan` and `import` checks after recovery | A new instance differs from the state |
| Lightsail alarms (CLI) | Present | Absent | Optional, and depends on the account and contacts |
| Daily log date file | Free-form, no format | Three sections (Done, Problems found, Remaining work) and a status column | So that PR creation, CI, merge, and deployment are written separately |
| Next steps | Priority table, follow-ups, execution boundaries | Priority table, user to-dos, follow-ups, operating status | Matches the rule of collecting user steps separately (std-git-writing). The basis for priority is the issue labels |
