# 553. Shared audit log table and helper

## Change

- `templates/app/backend/src/standard/audit.ts` (new managed file): `writeAudit(db, entry)` inserts one `audit_log` row (actor type `user`/`ai-tool`/`system`, actor ID, client, tool, action, entity, entity ID, result, `before`/`after` JSON summaries, request ID); `auditContext(req, res)` gives the signed-in user and the request ID. It imports only types and takes any object with pg's `query`, so a Pool or a transaction client works.
- `scaffold/app/database/migrations/002_audit_log.sql`: the table, with CHECK lists for actor type, action and result, and indexes on time and entity. Existing apps copy it as their next migration.
- `templates/app/deploy/backup.sh.tmpl` (managed): the nightly dump deletes `audit_log` rows older than 365 days, after the dump; nothing happens without the table, and a failure does not fail the backup.
- `docs/audit-log.md`, `docs/directory-rules.md`, `docs/runbooks/backup-restore.md`: columns, how to write a row in the change's transaction, retention, how to read it.

## Reason

- AI tools will act for the owner (ADR-0017); without an audit log there is no way to see or undo what a tool did. The columns include the AI client and tool name (#553 comment).
- Retention of one year keeps the table small on the 2 GB server; the backup timer already runs daily on every app, so no new timer is needed.

## Verification

- `node --test scripts/test/backend-audit.test.mjs`: 6 pass (row values, nulls, a failed insert rejects, `auditContext`, INSERT columns equal the migration columns, CHECK lists and the retention days in the backup script).
- Postgres 17 in a throwaway container: the migration runs twice; `writeAudit` works on a Pool and inside a transaction; the CHECK rejects an unknown actor type; the prune deletes only a 400-day-old row and does nothing when the table is missing.
- `audit.ts` in a workout-memo checkout: Prettier, ESLint and `tsc` pass, including calls with `Pool` and `PoolClient`.
- `npm run check`: see the PR.

## Follow-up

- workout-memo writes a row on create, update and delete (this issue's last task): an app PR after the sync PR brings `audit.ts`.
