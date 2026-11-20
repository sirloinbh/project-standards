# #846 Managed deploy/bootstrap-env.sh for apps

`remote-deploy.sh` already runs `deploy/bootstrap-env.sh` when `.env` is missing, but only the two shared services shipped one (project-owned). The 7 apps that are not on the server yet had no way to create their first `.env`, so their first deploy would stop. workout-memo got its `.env` from the Terraform first-boot user data.

## Change

| File | Content |
|---|---|
| `templates/app/deploy/bootstrap-env.sh.tmpl` | Managed file for the `app` profile. Writes `POSTGRES_DB`, `POSTGRES_USER` (the registry `db.name`), a new `POSTGRES_PASSWORD` (`openssl rand -hex 24`), `WEB_BIND=127.0.0.1` and `WEB_PORT` (registry web port), mode 600 |
| `scripts/test/deploy-helpers.mjs`, `deploy-templates.test.mjs` | Every app receives the file; test of the content (no token, no SSM key) and a run in a temp checkout checking the five keys and a 48-hex password |
| `scripts/test/fixtures/sync-snapshot.json` | The 8 apps receive the new file |

## Decisions

- It never writes `NODE_AUTH_TOKEN` or an SSM key; those stay user and SSM steps (`remote-deploy.sh` reads SSM keys after the `.env` exists).
- For workout-memo the file is a no-op: the server already has `.env`, and `remote-deploy.sh` only runs the script when `.env` is missing.
- The services keep their own project-owned `bootstrap-env.sh` (the service profile does not include `templates/app`).
