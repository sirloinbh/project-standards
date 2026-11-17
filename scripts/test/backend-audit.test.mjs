// Tests the managed backend file templates/app/backend/src/standard/audit.ts (#553) and that its INSERT matches the
// scaffold migration. Node runs it directly by stripping the types; the file imports only types.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditContext, AUDIT_RETENTION_DAYS, writeAudit } from '../../templates/app/backend/src/standard/audit.ts';

const root = new URL('../../', import.meta.url);
const migration = readFileSync(new URL('scaffold/app/database/migrations/002_audit_log.sql', root), 'utf8');
const backup = readFileSync(new URL('templates/app/deploy/backup.sh.tmpl', root), 'utf8');

function fakeDb() {
  const calls = [];
  return { calls, query: async (text, values) => calls.push({ text, values }) };
}

test('writeAudit inserts one row with JSON summaries, string IDs and ok by default', async () => {
  const db = fakeDb();
  await writeAudit(db, {
    actor: { type: 'ai-tool', id: 'u1', client: 'ai-shell', tool: 'add_workout' },
    action: 'create',
    entity: 'workout',
    entityId: 42,
    after: { name: 'Squat' },
    requestId: 'req-1',
  });
  assert.equal(db.calls.length, 1);
  assert.deepEqual(db.calls[0].values, ['ai-tool', 'u1', 'ai-shell', 'add_workout', 'create', 'workout', '42', 'ok', null, '{"name":"Squat"}', 'req-1']);
});

test('writeAudit leaves the optional fields null', async () => {
  const db = fakeDb();
  await writeAudit(db, { actor: { type: 'system', id: null }, action: 'delete', entity: 'session', result: 'error' });
  assert.deepEqual(db.calls[0].values, ['system', null, null, null, 'delete', 'session', null, 'error', null, null, null]);
});

test('writeAudit lets a failed insert reject, so the transaction rolls back with the change', async () => {
  const db = { query: async () => Promise.reject(new Error('relation "audit_log" does not exist')) };
  await assert.rejects(writeAudit(db, { actor: { type: 'user', id: 'u1' }, action: 'update', entity: 'workout' }), /audit_log/);
});

test('auditContext takes the user from the shared sign-in and the request ID from requestLog', () => {
  assert.deepEqual(auditContext({ user: { id: 'u1', email: 'a@b' } }, { locals: { requestId: 'req-1' } }), {
    actor: { type: 'user', id: 'u1' },
    requestId: 'req-1',
  });
  assert.deepEqual(auditContext({}, { locals: {} }), { actor: { type: 'user', id: null }, requestId: null });
  assert.deepEqual(auditContext({ user: { id: 7 } }, { locals: { requestId: 3 } }), { actor: { type: 'user', id: null }, requestId: null });
});

test('the INSERT columns are the scaffold migration columns', async () => {
  const db = fakeDb();
  await writeAudit(db, { actor: { type: 'user', id: 'u1' }, action: 'read', entity: 'workout' });
  const inserted = /INSERT INTO audit_log \(([^)]+)\)/.exec(db.calls[0].text)[1].split(',').map((c) => c.trim());
  const table = /CREATE TABLE IF NOT EXISTS audit_log \(([\s\S]+?)\n\);/.exec(migration)[1];
  const columns = table.split('\n').map((line) => line.trim().split(' ')[0]).filter(Boolean);
  assert.deepEqual(columns.filter((c) => c !== 'id' && c !== 'at').sort(), [...inserted].sort());
});

test('the migration CHECK lists match the helper types, and the backup prunes after the retention period', () => {
  assert.match(migration, /actor_type IN \('user', 'ai-tool', 'system'\)/);
  assert.match(migration, /action IN \('read', 'create', 'update', 'delete'\)/);
  assert.match(migration, /result IN \('ok', 'denied', 'error'\)/);
  assert.ok(backup.includes(`make_interval(days => ${AUDIT_RETENTION_DAYS})`));
});
