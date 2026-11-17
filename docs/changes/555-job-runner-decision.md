# 555. Job runner decision for app background work

## Change

- `docs/adr/0018-job-runner-pg-boss.md`: proposed ADR. Apps use `pg-boss` in their own Postgres, run inside the existing api process (no worker container by default), with rules for idempotency, retries, schedules, payloads, and logs, a small status page, a shared package, and money-ledger as the pilot.

## Reason

- money-ledger already hand-writes a scheduler with an advisory lock, and study-log runs long Claude calls inside requests; notifications (#557) and the AI shell (ADR-0017) may add more.
- The server is moving to 2 GB with about 900 MiB of room (#564). pg-boss adds no container; Hatchet, Inngest, and Trigger.dev each add a shared service, and Trigger.dev's self-hosted minimum is larger than the server.

## Verification

- Facts checked on 2026-11-17: pg-boss 12.38.2 (MIT, Node 22.12+, PostgreSQL 13+, queue policies and retry defaults from pgboss.io), `@pg-boss/dashboard` 1.13.1, Graphile Worker 0.18.0, Hatchet and Inngest self-hosting docs and licenses, Trigger.dev self-hosting requirements and the 2026-11-01 incident coverage.
- App jobs checked in the local clones of the 8 app repos (money-ledger `prices/scheduler.ts`, study-log `translation.ts` and `extraction.ts`, health-log `reminders.ts`, cert-manager import scripts).
- `npm run check`: see the PR.

## Follow-up

- Waiting for the user's decision. After acceptance: set the ADR status, update #556 to match (in-process by default instead of a `worker` service per app), and close #555.
