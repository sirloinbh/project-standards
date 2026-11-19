# Audit log

Each app records who created, changed, or deleted what in its own `audit_log` table (#553), so the owner can see what an AI tool did. Every AI tool call writes a row through the shared `defineTool` wrapper (ADR-0017, #559). A route is not required to write one ([ADR-0024](adr/0024-audit-ai-tool-calls-only.md)); an app may use the helper below for a route when the history is worth it (workout-memo does for workouts). There is no undo or history feature: the owner reads the log with the query under "Reading it".

## Table

The app adds it as its next migration, `database/migrations/NNN_audit_log.sql`, copied from [the scaffold's `002_audit_log.sql`](../scaffold/app/database/migrations/002_audit_log.sql). New apps from the scaffold already have it.

| Column | Meaning |
|---|---|
| `id`, `at` | Row ID and time (`timestamptz`, set by the DB) |
| `actor_type` | `user`, `ai-tool`, or `system` (a job) |
| `actor_id` | The shared sign-in user ID; null for a job |
| `client`, `tool` | For an AI tool: `ai-shell`, the MCP client ID, or `stdio`; and the tool name in the app (`add_workout`) |
| `action` | `read`, `create`, `update`, or `delete`. Reads are recorded for AI tool calls only |
| `entity`, `entity_id` | The kind of record in singular snake_case (`workout`) and its ID as text |
| `result` | `ok`, `denied` (missing scope), or `error` |
| `before`, `after` | `jsonb` summaries of the record: the fields that changed, not whole rows with long text. A value whose JSON is longer than 2,048 characters (`AUDIT_VALUE_LIMIT`) is stored as `{ "truncated": true, "length": <characters>, "preview": "<the start>" }`. Pass `omit: ['body', 'note']` to `writeAudit` to drop those keys at any depth before the value is stored |
| `request_id` | The request ID from the log line ([logging.md](logging.md)) |

## Writing a row

`backend/src/standard/audit.ts` is a managed file:

```ts
import { auditContext, writeAudit } from '../standard/audit.js';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const { rows } = await client.query('INSERT INTO workouts (name) VALUES ($1) RETURNING id, name', [name]);
  await writeAudit(client, { ...auditContext(req, res), action: 'create', entity: 'workout', entityId: rows[0].id, after: rows[0] });
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

- Write the row with the same client, in the same transaction as the change. If the insert fails, the change rolls back too.
- `auditContext(req, res)` gives the signed-in user (from the shared sign-in) and the request ID (from `requestLog`).
- A single-statement change can use a CTE instead of a transaction, as long as the audit row is in the same statement.

## Retention

Rows older than 365 days (`AUDIT_RETENTION_DAYS`) are deleted by the nightly backup (`deploy/backup.sh dump`), after that night's dump, so the dumps keep them 14 more days ([runbooks/backup-restore.md](runbooks/backup-restore.md)). Before an app has the table, the step does nothing.

## Reading it

```sh
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select at, actor_type, tool, action, entity, entity_id, result from audit_log order by at desc limit 50"
```
