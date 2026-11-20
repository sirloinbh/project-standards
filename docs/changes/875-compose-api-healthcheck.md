# #875 compose api healthcheck

## Change

| File | Content |
|---|---|
| `scaffold/app/compose.yaml` | `api` gets a `healthcheck` on `/api/health` (`node -e fetch(...)`, the image has no curl; 5 s interval, 15 retries, 10 s start period). `web` uses `depends_on: api: condition: service_healthy` |
| `scripts/standards-check.mjs` | `checkComposeWarnings(text)`: a warning, not a failure, when the `api` service has no `healthcheck`; `runCheck` adds it for app repos with a compose file |
| `scripts/test/standards-check.test.mjs`, `scaffold.test.mjs` | Tests for the warning (with, without, no api service) and for the scaffold; the shared fixture compose now has the healthcheck |

## Notes

- `docker compose config` accepts the rendered scaffold compose (checked on study-log's values).
- The existing apps get the warning from the next sync (`.standards/check.mjs` is vendored). Their `compose.yaml` is repo-owned, so each app adds the healthcheck in its own PR. `remote-deploy.sh` still waits for `db` and polls `/api/health` itself, so nothing changes at deploy time.

## Checks

- `npm run check`: see the PR.
