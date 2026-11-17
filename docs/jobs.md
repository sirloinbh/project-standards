# Background jobs

Apps run background work (scheduled fetches, slow outside calls, retries) on [pg-boss](https://github.com/timgit/pg-boss) in their own Postgres, inside the existing `api` process ([ADR-0018](adr/0018-job-runner-pg-boss.md), #556). There is no shared job service, no Redis, and no extra container.

## Turning it on

1. Set `features.jobs` to `true` for the app in `registry/projects.json` (central PR). The next sync PR brings the managed file `backend/src/standard/jobs.ts` (source: `templates/jobs/`). It imports only types, so it compiles before pg-boss is installed.
2. In the app, install pg-boss in `backend` as [dependency-policy.md](dependency-policy.md) says: `npm install --ignore-scripts --save-exact pg-boss@<version>`, at least 14 days old (12.38.0 on 2026-11-18), then `npm run lockfiles:sync`.
3. Define the queues in the app's own code and start them in `server.ts` (below).

pg-boss creates its tables in a `pgboss` schema on first start, so no app migration is needed and the existing nightly backup already covers them.

## Defining and starting queues

```ts
// backend/src/jobs.ts (the app's own file)
import type { JobQueue } from './standard/jobs.js';

export const priceQueue: JobQueue<{ day?: string }> = {
  name: 'daily-prices',
  policy: 'singleton', // one active run at a time, across processes
  retryLimit: 6,
  retryDelay: 600,
  schedule: '0 12 * * *', // cron in Asia/Seoul
  handler: async (input, job) => {
    // must be safe to run twice: upsert, or check "done today" first
  },
};
```

```ts
// backend/src/server.ts
import { PgBoss } from 'pg-boss';
import { jobBossOptions, jobsModeFromEnv, jobsStatus, startJobs } from './standard/jobs.js';

const jobs = await startJobs(new PgBoss(jobBossOptions(process.env.DATABASE_URL!)), [priceQueue], {
  mode: jobsModeFromEnv(),
});
app.get('/api/jobs/status', jobsStatus(jobs.boss)); // under /api, after app.use('/api', auth)
process.on('SIGTERM', () => {
  server.close(() => void jobs.stop().then(() => pool.end()));
});
```

Queue a job from a route with an idempotency key and the request ID, so the job's log lines join the request's. A `key` only works on a queue whose policy enforces it (below); `send-receipt` here has `policy: 'exclusive'`:

```ts
await jobs.send('send-receipt', { entryId: 42 }, { key: 'entry-42', requestId: requestIdOf(res) });
```

## Policies and keys

A `key` is pg-boss's `singletonKey`. What it prevents depends on the queue policy (pg-boss 12 unique indexes); a send the policy refuses returns `null`. A queue's policy is fixed once created, so a different policy needs a new queue name.

| Policy | With the same key |
|---|---|
| `standard` (default) | Nothing is prevented, so `send` with a `key` throws |
| `short` | One queued job; one may still be running |
| `singleton` | One running job; more may be queued. Also the right policy for a schedule that must not overlap itself |
| `stately` | One queued, one retrying, and one running job |
| `exclusive` | One queued or running job: "one per thing", a double click queues one job |

Handlers still have to be safe to run twice: a job can run again after a crash or an expiry.

## What `jobs.ts` does

| Item | Behavior |
|---|---|
| Connection | `jobBossOptions(url)`: the app's database, schema `pgboss`, pool `max` 2, so pg-boss does not compete with the app's `pg` pool |
| Queues | `startJobs` creates the `dead-letter` queue, then each queue (or updates its options if it exists; a policy is fixed once created) |
| Retries | Default `retryLimit` 3, `retryDelay` 30 s with exponential backoff and jitter. A job that runs out of retries is copied to `dead-letter` |
| Non-retryable errors | Throw `NonRetryable` (or an error with a 4xx `status` such as `HttpError`, or a zod error): the job goes to `dead-letter` at once, without retries. Uses pg-boss `perJobResults` with the `deadletter` status |
| Idempotency | `send(..., { key })` sets pg-boss `singletonKey`, enforced per the queue policy (above) |
| Payloads | Stored as `{ input, requestId }`. Only IDs and small inputs: over 4096 bytes is refused. No secrets, tokens, or health details, because payloads are stored in the DB |
| Schedules | `schedule` (cron) runs in `Asia/Seoul`. A schedule removed from the code is unscheduled at the next start |
| Logs | One JSON line per run: `time`, `level`, `queue`, `jobId`, `attempt`, `requestId`, `result` (`ok`, `retry`, `failed`, `dead-letter`), `ms`, and `message` on failure, cut to 200 characters. Never the payload ([logging.md](logging.md)). A run that passes `expireInSeconds` is failed by pg-boss itself and retried without a line from the wrapper |
| Shutdown | `jobs.stop()` waits up to 8 s for running jobs (`graceful`), then closes pg-boss's pool. Call it before `pool.end()` |
| Status view | `jobsStatus(boss)` answers JSON (no HTML page): counts per queue, the 10 newest jobs per queue, failed jobs, the 50 newest dead-lettered jobs, and schedules. It shows request IDs and error messages (cut to 200 characters), not inputs. Mount it under `/api` so the shared sign-in guards it |

## Where jobs run (`JOBS_MODE`)

| Value | Meaning |
|---|---|
| unset or `all` | Default. The api process sends and works the queues (ADR-0018) |
| `send` | The api process only sends. Use it when the app adds a `worker` service (same image, a command that calls `startJobs` without Express) because jobs slow its requests. The split is a compose change only |
| `off` | pg-boss is not started and `send` returns `null`. For tests and a second local server on the same DB |

## Dead-lettered jobs

A job in `dead-letter` has no worker, so it stays queued until pg-boss's retention removes it (`retentionSeconds`, 14 days by default). The status view shows it with the queue it came from (`from`), its error, and how many attempts it had. To run one again after fixing the cause, send a new job to the original queue (or call pg-boss `redrive` from a one-off script); to drop it, let it expire. Schedules are set by every mode except `off`; only `all` removes a schedule whose queue is gone from the code.

## Testing

The central test `scripts/test/backend-jobs.test.mjs` runs `jobs.ts` against a fake of the pg-boss calls (retry, non-retryable failure, idempotency key, schedules, modes, the status view). Apps test their handlers as plain functions and, where it matters, run pg-boss against the test Postgres.
