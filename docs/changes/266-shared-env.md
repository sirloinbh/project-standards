# #266 Keep the shared keys in one place, project-standards

- Issue: #266 (ADR-0010 change)
- Branch: `docs/266-shared-claude-workspace`

## Goal

Do not tie the shared Claude API key and the server AWS key to a specific app (study-log, workout-memo). Keep them in one place, `project-standards`, on both the server and the PC (user decision, 2026-10-29).

## Change

| File | Content |
|---|---|
| `templates/app/deploy/ssm-get.sh.tmpl` | Reads `SECRETS_AWS_*` first from the shared server file `/opt/project-standards/.env`, and from the app `.env` if it is not there |
| `templates/app/deploy/backup.sh.tmpl` | Reads `BACKUP_S3_*` and `BACKUP_AWS_*` in the same order |
| `templates/app/deploy/remote-deploy.sh.tmpl` | If either file has `SECRETS_AWS_ACCESS_KEY_ID`, reads the Claude key from SSM |
| `tools/app-secrets.mjs` | `pull` writes to the single `project-standards/.env` instead of the app `.env`. `check` shows that file and the list of apps that read the key. Removed the `--app` and `--base` options |
| `docs/adr/0010-claude-api-key-ssm.md`, `docs/user-steps.md`, `docs/tools.md`, `docs/runbooks/` | Location and name changes, use of Max credit, and a workspace shared by apps |

- Scripts can change the shared file path with `STANDARDS_ENV_FILE` (for tests).
- Keys left in the app `.env` are used only as a fallback. If the shared file has the same key, the shared file wins.

## Remaining work

- shared-aws-infrastructure: rename IAM users `workout-memo-*` to `sirloinbh-apps-*` (separate PR, the user applies it)
- study-log: make the backend `dev` script read `../../project-standards/.env` (separate PR)
- 8 apps: pick up the deploy script changes with the next sync PR
