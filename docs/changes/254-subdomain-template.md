# #254 Switch the app template to subdomain access

## Change

| File | Content |
|---|---|
| `scripts/lib/vars.mjs` | New template variable `service.host` (`<subdomain>.<root domain>`, from `serviceHost` in the registry) for app targets |
| `templates/app/frontend/nginx.conf.tmpl` | `server_name {{service.host}}` instead of `_`, with `listen 80 default_server` so `127.0.0.1:<ports.web>` still answers locally and for health checks. `real_ip` from `X-Forwarded-For`, trusting `127.0.0.1` and the Docker networks (`172.16.0.0/12`), so the API rate limit counts each client behind the proxy |
| `scripts/lib/sync-plan.mjs`, `scripts/standards-check.mjs` | The manifest registry values carry `host`; `standards-check` fails when `server_name` in `frontend/nginx.conf` differs from it. Manifests written before this change have no `host` and skip the rule |
| `docs/runbooks/deploy.md`, `docs/runbooks/backup-restore.md` | Address `https://<host>`, server `.env` defaults `WEB_BIND=127.0.0.1` and `WEB_PORT=<ports.web>`, the web port is not opened in the firewall, the health check uses the web port, and the `real_ip` note |
| `docs/env-conventions.md`, `docs/server-proxy.md` | The same rule, and the proxy runbook no longer says apps answer on their own ports |
| Tests | `docker.test.mjs` (server_name and real_ip lines), `standards-check.test.mjs` (a different server_name fails) |

Checked and left as is: the PWA manifest uses relative `start_url` and `scope`, the API has no CORS setting (the frontend calls it on the same origin), and the deploy scripts already check health on `127.0.0.1:$WEB_PORT`.

## Order for the sync PRs

1. **workout-memo first.** Its server `.env` was already moved to `WEB_BIND=127.0.0.1`, `WEB_PORT=8101` during #253, so merging the sync PR only changes `frontend/nginx.conf`. After the auto-deploy, check `https://workout-memo.daysofme.com` and `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8101/api/health` on the server.
2. **The other 7 apps.** They are not deployed on the server yet, so merging only changes the repository. When each one is first deployed, its server `.env` needs `WEB_BIND=127.0.0.1` and `WEB_PORT=<ports.web>`.

`docs/runbooks/` is copied into an app only when it is scaffolded, so existing apps keep their own `docs/deployment.md`; their wording is updated in each app as needed.

## Not in this change

- `user-data.sh` in shared-aws-infrastructure still writes `WEB_BIND=0.0.0.0` and `WEB_PORT=80` for workout-memo on a new server. It is an infrastructure repo file (not synced), so it gets its own issue there.

## Verification

- `npm run check`: recorded in the PR body
