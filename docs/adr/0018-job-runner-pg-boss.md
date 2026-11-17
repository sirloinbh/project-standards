# 0018. App background jobs: pg-boss in each app's own Postgres, run inside the api process

- Status: Accepted (issue #555; user decision, 2026-11-18)
- Date: 2026-11-17
- Builds on: [ADR-0009](0009-multi-app-single-lightsail.md) (one Lightsail server, one compose project per app with its own Postgres, server work as systemd timers), [ADR-0017](0017-ai-service-mcp-and-shell.md) (`shared-ai` adds one more service to the same server)

## Context

### What the apps run in the background today (checked in the app repos on 2026-11-17)

| App | Work | How it runs now | Fits a job runner |
|---|---|---|---|
| money-ledger | Daily price fetch at 12:00 Asia/Seoul, retried once an hour until 18:00, then a snapshot of the mock account | Hand-written in the api process: a one-minute `setInterval`, a Postgres advisory lock so two processes never run it together, and a state table for "done today" (`backend/src/prices/scheduler.ts`) | Yes: a scheduled job with retries and a singleton rule. This is the code a runner would replace |
| study-log | Claude translation of an exercise and Claude extraction of problems from an uploaded file | Inside the HTTP request, with a 120-second client timeout (`backend/src/translation.ts`, `extraction.ts`) | Yes, later: a long Claude call fits a job with retries and a "pending" state better than a request that can time out |
| health-log | Visit and medication reminders | Computed when the page is read; nothing is sent | Not yet. Sending a notification is #557 |
| cert-manager | Song list, lyrics, word, and etymology imports | Manual `npm run` scripts | No: one-off scripts run by hand |
| The other apps | None found | | |

So one app already carries a hand-made scheduler, one has slow Claude calls inside requests, and notifications (#557) and the AI shell (ADR-0017) may add more. The need is real but small: a few jobs per app, at most a few hundred runs a day, for one user.

### Constraints

- Stack: Node 24, Express 5, `pg`, Zod 4, PostgreSQL 17, one compose project per app (`nginx`, `api`, `postgres`).
- One Lightsail server for 8 apps, `shared-auth`, the planned `shared-ai`, and the proxy. Measured on 2026-11-15 (#564, [costs.md](../costs.md)): one app takes about 95 MiB idle (Postgres 62, api 29, nginx 3), the OS and Docker about 340 MiB. The decision there is to move to 2 GB, which leaves about 900 MiB for builds, `shared-auth`, `shared-ai`, and workers.
- No new paid service and no outside cloud holding app data or secrets.
- New packages must be at least 14 days old, and the first install needs the user's confirmation ([dependency-policy.md](../dependency-policy.md)).

## Options considered

Facts checked on 2026-11-17 from the official sites, GitHub, and the npm registry.

| | `pg-boss` | Graphile Worker | Hatchet (self-hosted) | Inngest (self-hosted) | Trigger.dev (self-hosted) |
|---|---|---|---|---|---|
| What it is | Node library; queue tables in a `pgboss` schema of the app's own Postgres | Node library; queue tables in the app's own Postgres | Go engine, API, and dashboard; its own Postgres, RabbitMQ optional | One Go server (`inngest start`); SQLite or Postgres, built-in Redis | Webapp, supervisor, Postgres, Redis, registry, object storage, ClickHouse recommended |
| New containers on our server | None (runs in the api process) | None | 1 to 3 shared (hatchet-lite plus its Postgres, or the full compose) | 1 shared, plus apps must expose an HTTP endpoint it calls | Several; documented minimum is 3 vCPU / 6 GB for the webapp host and 4 vCPU / 8 GB for workers |
| Extra memory | Only the library inside an existing process | Same | A Go service and another Postgres (not measured; at least ~100 MiB) | A Go service with an in-memory Redis (not measured) | Far over the whole 2 GB server |
| Retries | Yes: `retryLimit`, `retryDelay`, exponential backoff with jitter, dead-letter queue with redrive | Yes: exponential backoff, 25 attempts by default | Yes | Yes | Yes |
| Scheduling | Cron and RRULE (`schedule()`), delayed jobs | Crontab with backfill | Yes | Yes | Yes |
| Duplicate protection | `singletonKey` plus queue policies `singleton`, `short`, `stately`, `exclusive`, `key_strict_fifo` | `job_key` | Yes | Idempotency keys | Idempotency keys |
| Status view | `@pg-boss/dashboard` (MIT, React and Hono, a separate small server), or SQL on the `pgboss` tables | None built in | Web dashboard | Web dashboard | Web dashboard |
| Latency | Polling, optional `LISTEN/NOTIFY` | `LISTEN/NOTIFY`, a few ms | Low | Low | Low |
| License | MIT | MIT | MIT | SSPL, Apache 2.0 after a delay | Apache 2.0 |
| Version | 12.38.2 (2026-11-10); 12.38.0 (2026-10-13) passes the 14-day rule today. Node 22.12+, PostgreSQL 13+ | 0.18.0 (2026-09-08); Node 22.18+ | | | |
| Backup and restore | Inside the app's database, so the existing per-app backup covers it | Same | A separate database to back up | A separate store to back up | Several stores |

Notes on the dropped options:

- **Trigger.dev**: the self-hosted minimum alone is several times our server. On 2026-11-01 Trigger.dev disclosed that an attacker read environment variables of a subset of its cloud organizations; as of 2026-11-05 the cause and scope were not published, so its cloud is out too.
- **Inngest**: the cloud would hold app payloads outside our servers. Self-hosted, it is one more always-on service that calls into every app over HTTP, and its server license is SSPL.
- **Hatchet**: a good fit for many workers and heavy fan-out, but it adds a shared engine and its own database for a load of a few hundred jobs a day, and every app would depend on it being up.
- **Graphile Worker**: as small as pg-boss and faster to pick up jobs, but it has no free status view and fewer duplicate-protection policies. It is the fallback if pg-boss stops being maintained.

## Decision

### Runner

**`pg-boss`**, one instance per app, in that app's own Postgres (schema `pgboss`). No shared job service, no Redis, no new container.

### Where it runs

| Item | Decision |
|---|---|
| Process | Inside the existing `api` process: Express serves requests and the same process works the queues. No separate `worker` service in `compose.yaml` |
| Why not a worker container | A second Node process per app costs about 30 MiB each, about 240 MiB for 8 apps, on a server with about 900 MiB of room. The jobs we have are light |
| When to split | If one app's jobs slow its requests (CPU-heavy work, many long Claude calls), that app adds a `worker` service that runs the same image with a different command. The shared package supports both modes from the start, so the split is a compose change only |
| Connections | pg-boss keeps its own pool; set `max` to 2 or 3 so it does not compete with the app's `pg` pool |
| Shutdown | Call `boss.stop()` on `SIGTERM` before closing the pool, so a deploy waits for running jobs (graceful stop) |

### Rules for every job

| Item | Decision |
|---|---|
| Idempotency | A job handler must be safe to run twice. Use `singletonKey` (or a queue policy) for "one per thing", and write results with an upsert or a "done" check |
| Retries | Exponential backoff on by default, with a retry limit and a dead-letter queue per app. Errors that cannot succeed on retry (validation, 4xx) fail without retrying |
| Schedules | `schedule()` with the `Asia/Seoul` time zone. Scheduled work in the app moves from hand-written timers to pg-boss; server-level work (deploy, backup, restore check) stays in systemd timers (ADR-0009) |
| Payloads | Only IDs and small inputs. No secrets, tokens, or health details in a payload, because payloads are stored and shown in the status view |
| Logs | Each job logs its queue, job ID, attempt, and result as JSON lines, with the request ID that queued it (#552) |
| Retention | pg-boss defaults (completed jobs deleted after 7 days); a job that runs out of retries is copied to the dead-letter queue and shows in the status view until someone retries or deletes it |

### Status view

A small read-only status page in each app (recent, failed, and scheduled jobs), behind the shared sign-in, built in the shared package from the pg-boss API and read-only SQL on the `pgboss` tables. The `@pg-boss/dashboard` server is not adopted now: it is one more server and port per app and brings its own React and Hono versions. Revisit if the small page is not enough.

### Packaging

A shared package (working name `@sirloinbh/jobs`) wraps the pg-boss setup, the defaults above, graceful stop, JSON logging, and the status queries. Apps opt in with a `features` flag in the registry. The exact pg-boss version is pinned and at least 14 days old; the first install needs the user's confirmation.

### First app

money-ledger: replace the hand-written price scheduler and advisory lock with a pg-boss schedule and a `singleton` queue. It already has the need and tests that pin the behavior (12:00 start, hourly retries until 18:00).

## Consequences

- No new container and no shared job service. A job runner failure stays inside one app.
- Each app's database gets a `pgboss` schema and a few tables; backups already cover them.
- Jobs share the api process's CPU and memory. Heavy work is the trigger to split a worker container (above).
- Jobs and data are in the same database, so a job can be queued in the same transaction as the change that needs it.
- Cross-app events (one app reacting to another) are not covered: each app's queue is private. That question stays in #557.
- If pg-boss stops being maintained, Graphile Worker is the closest replacement with the same shape.

## Follow-up work

| Issue | What this decision settles |
|---|---|
| #556 | The shared package and template: in-process by default (not a `worker` service per app), the job rules above, a status page, money-ledger as the pilot |
| #557 | Cross-app events and notifications are decided separately; per-app pg-boss queues do not reach other apps |
| #552 | Job logs carry the request ID |

## Sources (checked 2026-11-17)

- pg-boss: [github.com/timgit/pg-boss](https://github.com/timgit/pg-boss), [pgboss.io queue policies](https://pgboss.io/api/queues), [constructor options](https://pgboss.io/api/constructor), npm registry (`pg-boss`, `@pg-boss/dashboard`)
- Graphile Worker: [worker.graphile.org/docs](https://worker.graphile.org/docs), npm registry (`graphile-worker`)
- Hatchet: [docs.hatchet.run/self-hosting](https://docs.hatchet.run/self-hosting), [github.com/hatchet-dev/hatchet](https://github.com/hatchet-dev/hatchet)
- Inngest: [inngest.com/docs/self-hosting](https://www.inngest.com/docs/self-hosting), [github.com/inngest/inngest](https://github.com/inngest/inngest)
- Trigger.dev: [trigger.dev/docs/self-hosting/docker](https://trigger.dev/docs/self-hosting/docker); incident coverage: [The Register](https://www.theregister.com/a/5306998), [SC World](https://www.scworld.com/brief/trigger-dev-discloses-security-incident-involving-exposed-environment-variables)
