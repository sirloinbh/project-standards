# 556. Shared job runner on pg-boss

## Change

| File | Content |
|---|---|
| `templates/jobs/backend/src/standard/jobs.ts` | New feature folder and managed file. `startJobs(boss, queues, { mode })` creates a per-app `dead-letter` queue and each queue (exponential backoff retries, default 3), sets cron schedules in `Asia/Seoul`, and works the queues in the api process. `NonRetryable` (or a 4xx `status`, or a zod error) dead-letters a job without retries through pg-boss `perJobResults`. `send(..., { key, requestId })` uses `singletonKey` and refuses payloads over 4096 bytes. One JSON log line per run with queue, job ID, attempt, result and request ID. `jobs.stop()` waits up to 8 s. `jobsStatus(boss)` is the read-only status view |
| `scripts/test/backend-jobs.test.mjs` | 24 tests against a fake that follows pg-boss 12.38's rules (per-policy key indexes, the dead-letter copy's `source*` fields, `findJobs` paging): retry then dead-letter, retry then success, non-retryable (three error kinds), 5xx retried, keys per policy, input and request ID, payload and message limits, a throwing log, schedules, modes, stop, status view |
| `scripts/test/sync.test.mjs` | `jobs.ts` joins a plan only with `features.jobs` on |
| `sync.config.json`, `registry/projects.schema.json`, `registry/projects.json` | `features.jobs`. Only money-ledger turns it on (the pilot) |
| `docs/jobs.md` (new), `docs/directory-rules.md`, `docs/dependency-policy.md` | How to turn it on and use it; `pg-boss` 12 in the major-version table |
| `scripts/test/scaffold.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | The new flag; money-ledger receives `backend/src/standard/jobs.ts` |

## Decisions

- **A managed file, not a `@sirloinbh/jobs` package.** ADR-0018 named a package as a working name. The other backend helpers (`http.ts`, `audit.ts`, `tools.ts`) are managed files under `backend/src/standard/`, which need no tag release (a user step) and no `NODE_AUTH_TOKEN` change. The file imports only types and takes the app's `PgBoss` instance, so it does not pin a pg-boss version and the central repo tests it without the package.
- **pg-boss version:** 12.38.0 (2026-10-13), the newest release past the 14-day rule on 2026-11-18 (12.38.1 is from 2026-11-05). MIT, repository `timgit/pg-boss`, no install scripts (`prepublishOnly` only runs on publish). The app installs it in its own PR.
- **Non-retryable path:** pg-boss retries every thrown error, so handlers run under `perJobResults: true` with `batchSize: 1`; a non-retryable error returns the `deadletter` status, which pg-boss documents as "fails the job terminally and routes it straight to the queue's dead letter queue, bypassing any remaining retries".
- **Existing queues:** pg-boss's `create_queue` ignores an existing queue, so a restart calls `updateQueue` with the new options; the policy cannot change once created (pg-boss `UpdateQueueOptions` omits it).
- **Keys need a policy:** pg-boss enforces `singletonKey` only through the unique indexes of the `short`, `singleton`, `stately` and `exclusive` policies (and `singleton` only for running jobs), so `send` with a `key` on a `standard` queue throws instead of silently queuing duplicates (found in review; the first fake deduped on every queue).
- **Restarts:** pg-boss rejects `updateQueue` with no properties, which the dead-letter queue has; the update is skipped then (found in the real run: every second boot crashed).
- **Internal queues:** pg-boss 12 keeps `__pgboss__*` queues; the status view leaves them out.
- **Dead-letter rows:** the dead-letter copy keeps the failure in `sourceOutput` and `sourceRetryCount`, so the status view reads those.
- **Payload shape:** `{ input, requestId }`, so the request ID that queued a job reaches its log lines (#552) without the handler seeing it in its input.
- **Status view:** JSON from the pg-boss API, mounted by the app behind the shared sign-in. `@pg-boss/dashboard` is not used (ADR-0018).
- **Modes:** `JOBS_MODE` `all` (default, in-process), `send` (a later `worker` service works the queues), `off` (tests, a second local server).

## Verification

- `node --test scripts/test/backend-jobs.test.mjs`: 24 pass. `node --test scripts/test/sync.test.mjs`: 13 pass.
- `jobs.ts` in a money-ledger checkout with `pg-boss@12.38.0` installed: `tsc -p tsconfig.check.json` passes with `startJobs(new PgBoss(jobBossOptions(url)), [queue])` and `jobsStatus(jobs.boss)`, so a real `PgBoss` fits the `JobBoss` type.
- Real pg-boss 12.38.0 on a throwaway Postgres 17.11: retry then dead-letter (3 runs), `NonRetryable` dead-lettered after 1 run, keys per policy (`standard` and `singleton` accept a duplicate; `short`, `stately`, `exclusive` return null), Asia/Seoul schedules, a status view without the input, and `stop()` passed. Restart and schedule removal failed on the first draft and were fixed. Rerun on the final file: all pass, plus three restarts in a row, `standard` with a key throws, dead-letter entries show the error and attempts (3 and 1), no `__pgboss__` queue in the status view, and paging past 1000 jobs returns the newest 10.
- ESLint, Prettier and `tsc --noEmit` with the money-ledger config: pass.
- `npm run check`: see the PR.

## Follow-up

- money-ledger pilot (this issue's last task): after the sync PR brings `jobs.ts`, an app PR installs pg-boss and replaces `backend/src/prices/scheduler.ts`.
