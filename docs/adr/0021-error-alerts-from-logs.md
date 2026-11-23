# 0021. Alert on errors from the JSON logs with the daily report; no error tracker or log service for now

- Status: Accepted (issue #554; user decision, 2026-11-18, including the default `REPORT_ERROR_LIMIT=0`)
- Date: 2026-11-17
- Builds on: [ADR-0009](0009-multi-app-single-lightsail.md) (one Lightsail server, IP allow list), #552 (JSON request logs, [logging.md](../logging.md)), #284 and #285 (healthchecks.io signals and the daily server report)

## Context

- Since #552 every app API writes one JSON line per request with a request ID. A 5xx response and an unexpected error go to stderr with `"level":"error"`. The logs stay in `docker compose logs` per app and are searched with `grep` ([logging.md](../logging.md)). Nothing tells the owner that an error happened.
- What already alerts, per app, through healthchecks.io ([`notify.sh`](../../templates/deploy/deploy/notify.sh.tmpl)):

  | Signal | When | What it catches |
  |---|---|---|
  | `health` | Every 5 minutes | `/api/health` is down, or the whole server is down (a missing ping) |
  | `deploy` | Every autodeploy run | A failed build or deploy |
  | `backup`, `restore` | Nightly, weekly | A failed dump or restore check |
  | `report` | Daily at 04:00 Seoul ([`report.sh`](../../templates/deploy/deploy/report.sh.tmpl)) | Memory over 85% or disk over 90%; the body is a one-line summary |

  None of them sees a 500 on one route while `/api/health` stays green.
- Docker keeps container logs with the `json-file` driver, `max-size` 10m and `max-file` 3 (`/etc/docker/daemon.json` from `shared-aws-infrastructure/user-data.sh`), so at most 30 MB per container. Old lines roll off; nothing is kept beyond that.
- The server is moving to 2 GB (#564) for 8 apps, shared-auth, the proxy, and soon `shared-ai` (ADR-0017), leaving roughly 900 MiB for builds, the auth service, and workers ([costs.md](../costs.md)). A new process has to fit in what is left.
- The apps hold personal data (journals, health records, money). Error events and log lines carry paths, IDs, and error messages; a message from Postgres or a validation library can quote a value. Data leaving the server is a cost, as ADR-0019 argued for Langfuse Cloud.
- Traffic is one owner and a few users. A few errors a day is the expected volume; stack grouping and release tracking matter less than noticing an error at all.

### Facts checked on 2026-11-17

- **Sentry (hosted)**: Developer plan free, 1 user, 5k errors, 5 GB logs, 30-day lookback; Team $29 a month ([sentry.io/pricing](https://sentry.io/pricing/)). Event data can be stored in the US (Iowa) or the EU (Frankfurt), also on the free plan; the region cannot be changed later, and some account metadata stays in the US ([docs.sentry.io data storage location](https://docs.sentry.io/organization/data-storage-location/)). Status aggregators show outages in 2026 but no reported data breach.
- **Sentry (self-hosted)**: minimum 4 cores, 16 GB RAM plus 16 GB swap (32 GB recommended), licensed FSL, turning Apache 2.0 after two years ([develop.sentry.dev/self-hosted](https://develop.sentry.dev/self-hosted/)). Does not fit.
- **Better Stack (hosted)**: free plan 3 GB logs a month kept 3 days, 100k exceptions a month, 10 monitors and heartbeats ([betterstack.com/pricing](https://betterstack.com/pricing)). Docker logs are shipped by Vector or the Better Stack collector, which reads the Docker logs (the `vector` user joins the `docker` group) ([betterstack.com/docs/logs/docker](https://betterstack.com/docs/logs/docker/)). No official memory figure for the collector.
- **Grafana Cloud (hosted)**: free tier 50 GB logs a month kept 14 days, 3 users ([grafana.com/pricing](https://grafana.com/pricing/)). Logs are shipped by Grafana Alloy; Grafana's sizing rule is about 120 MiB of memory per 1 MiB/s of logs, and community reports show Alloy containers at hundreds of MiB that grow over days ([Alloy resource usage](https://grafana.com/docs/alloy/latest/set-up/estimate-resource-usage/), [community thread](https://community.grafana.com/t/grafana-alloy-memory-usage/145672)).
- **GlitchTip (self-hosted)**: Sentry-SDK compatible, open source (MIT). Needs PostgreSQL 14+ and one GlitchTip service; Valkey or Redis is optional (the task queue can use Postgres). Recommended minimum 512 MB RAM; an all-in-one mode (`GLITCHTIP_EMBED_WORKER`) can run in 256 MB ([glitchtip.com install](https://glitchtip.com/documentation/install)). Latest major release 7.0 on 2026-11-09, 6.2 on 2026-06-22 ([glitchtip.com/blog](https://glitchtip.com/blog)). Hosted Hobby plan: free, 1,000 events a month, 30 days ([glitchtip.com](https://glitchtip.com/)). No GlitchTip CVE found in 2026; a similar tool, Bugsink, had a stored XSS from submitted events (CVE-2026-27614), which shows an event-ingest endpoint is attack surface.
- **Dozzle (self-hosted viewer)**: MIT, about 7 MB image, stores no logs, live view only, file or forward-proxy auth ([github.com/amir20/dozzle](https://github.com/amir20/dozzle)). It needs the Docker socket, which is root on the host. Five CVEs in 2026 so far, several rated high, including a pre-auth SSRF (CVE-2026-45298, fixed 10.5.2), cross-site WebSocket hijacking of exec and attach (CVE-2026-44985, fixed after 10.5.1), and an SSRF bypass up to 10.6.14 (CVE-2026-73087) ([vulert](https://vulert.com/vuln-db/CVE-2026-73087), [vulert](https://vulert.com/vuln-db/CVE-2026-44985), [radar.offseq](https://radar.offseq.com/threat/cve-2026-45298-cwe-918-server-side-request-forgery-50a02d3c)).

## Options considered

| | (A) Sentry Developer (EU region) | (B) Grafana Cloud or Better Stack free logs | (C) GlitchTip self-hosted, all-in-one | (D) Dozzle log viewer | (E) Logs only + error count in the daily report |
|---|---|---|---|---|---|
| What it gives | Errors grouped by stack, first-seen and regressions, email alert per new issue | All log lines searchable in a web UI, alert rules on queries | Same as (A), on our server | A live web view of every container's logs | `errors=N` per app in the daily report line, a `fail` signal (email from healthchecks.io) when N is over a limit, and the first request IDs to `grep` |
| Memory on the server | 0 (SDK in each API, a few MiB) | A shipper: Alloy or Vector, tens to hundreds of MiB, growth reported | 256 to 512 MiB plus a database (in an existing Postgres or a new one) | About 10 to 30 MiB (estimate, not measured) | 0 (runs once a day for seconds) |
| Money | 0 under 5k errors a month | 0 within the free quota | 0 (and disk) | 0 | 0 |
| Data leaving the server | Error events: stack traces, request URL, message, breadcrumbs, to Sentry in Frankfurt (account metadata in the US) | Every log line, to the vendor | None | None | Counts, request IDs, and paths in the healthchecks.io ping body (already the channel for the report) |
| Setup | `@sentry/node` in each app (a new package, 14-day rule, user confirmation), a DSN per app in SSM, scrubbing rules | A shipper container with the Docker socket or log files, a token, alert rules | A new service, subdomain, proxy route, backups, and the Sentry SDK in each app | A container with the Docker socket, a proxy route, auth | About 20 lines in `report.sh` (managed template), synced to every app |
| Upkeep | SDK upgrades in 8 apps; quota watching | Shipper upgrades; free quota and retention changes | Upgrades of a Django app and its DB, ingest endpoint exposed | Frequent security fixes on a root-equivalent container | None beyond the script |
| Alert speed | Minutes | Minutes | Minutes | None (no alerting) | Up to a day (the daily run); minutes for health, as today |

(A) and (B) send personal data to a third party for a few errors a day. (C) costs a third to a half of the free memory for the same few errors and adds an internet-facing ingest endpoint. (D) gives no alert, which is the gap the issue names, and puts a frequently patched container on the Docker socket. (E) closes the gap with the scripts and channel we already run.

## Decision

(E): no error tracker, no log service, no log viewer for now. The daily report counts error lines and alerts through the existing `report` signal.

| Item | Decision |
|---|---|
| Count | `report.sh` counts lines with `"level":"error"` in `docker compose logs --since 24h api` and adds `errors=<N>` to the report line. When N > 0 it also adds up to 5 request IDs with their `status` and `path` (`errors=3 [5f0c… 500 /api/workouts, …]`), so the owner can run the `grep` in [logging.md](../logging.md). No error `message` text goes into the ping body |
| Deploys | A deploy recreates the `api` container (`remote-deploy.sh`, `docker compose up -d` with a new image tag), and `docker compose logs` then shows only the new container. So `remote-deploy.sh` saves the old container's error lines from the last 24 hours to a file in the app's deploy folder just before `up -d`, and `report.sh` counts that file together with the running container's logs, then empties it. Without this, an app that deploys after an error would report `errors=0` |
| Alert | The `report` signal is `fail` when N is over `REPORT_ERROR_LIMIT` (server `.env`, default `0`: any error fails the day). healthchecks.io emails on `fail`, as it does for memory and disk today |
| Shared services | shared-auth and `shared-ai` get the same count: since #967 the report is in the shared deploy templates (`templates/deploy/deploy/`), and they use the same `requestLog` format and `api` container. Installing their report timer is a user step (`install-backup.sh`) |
| Retention | Unchanged: the Docker `json-file` limit (10 MB × 3 per container). The daily report runs well before a quiet app's errors roll off; a noisy app is the case to decide again |
| Not adopted | Sentry (hosted or self-hosted), Better Stack, Grafana Cloud, GlitchTip, Dozzle, a shared logger package (`pino`) |

### When to decide again

- Errors are frequent enough that one daily count hides which error is new (stack grouping starts to pay off). Look first at GlitchTip all-in-one in its own small database, measured on the server; then Sentry in the EU region with `sendDefaultPii` off and server-side scrubbing.
- A day's delay is too slow for an app (an app that others rely on): add an hourly run of the same count on a timer, before any new service.
- The server grows to 4 GB or more with at least 1 GB available after builds.
- Logs must be kept longer than the Docker limit (for example an incident review a month later): consider a nightly gzip of the error lines into the backup folder before a hosted log service.

## Consequences

- No new process, image, package, or secret. The memory budget in [costs.md](../costs.md) is unchanged by this decision, and no personal data leaves the server beyond what healthchecks.io already receives.
- An error is noticed within a day, not within minutes. A full outage is still caught in 5 minutes by `health`.
- There is no stack grouping or UI; finding the cause stays `grep` on the server with the request ID.
- With `REPORT_ERROR_LIMIT=0` a single 500 makes the day's report `fail`. Raise the limit per app in its `.env` if one app has known noisy errors, and open an issue for them.
- Follow-up when accepted (not implemented here): one issue to add the count, the request ID list, and `REPORT_ERROR_LIMIT` to `templates/app/deploy/report.sh.tmpl`, and the pre-deploy save to `remote-deploy.sh.tmpl`, with tests and a line in [logging.md](../logging.md) and [env-conventions.md](../env-conventions.md); one issue to add the same report to shared-auth's deploy scripts.
