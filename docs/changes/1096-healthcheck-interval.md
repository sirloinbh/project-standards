# #1096 Slow the compose healthchecks

The api healthcheck started a Node.js process every 5 seconds per app and kept the burstable shared server throttled.

| File | Content |
|---|---|
| `scaffold/app/compose.yaml` | `db` and `api` healthchecks: `interval: 60s`, `retries: 3`, `start_period`, `start_interval: 2s` (server Docker is 29.1.3, so `start_interval` is supported) |
| `scripts/standards-check.mjs` | `checkComposeWarnings` also warns when a healthcheck `interval` is under 30 s |
| `scripts/test/standards-check.test.mjs` | Test for the new warning (short, long, `start_interval`) |
| `docs/runbooks/deploy.md` | "Healthcheck cadence" rule and the reason |

Each app and shared service changes its own `compose.yaml` in its own repo (tracked on #1096).
