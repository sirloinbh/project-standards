// Tests the managed backend file templates/app/backend/src/standard/audit.ts (#553) and that its INSERT matches the
// scaffold migration. Node runs it directly by stripping the types; the file imports only types.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditContext, AUDIT_RETENTION_DAYS, AUDIT_VALUE_LIMIT, auditValue, writeAudit } from '../../templates/app/backend/src/standard/audit.ts';

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

test('a large value is stored as a valid truncated JSON summary (#675)', async () => {
  const big = { note: 'x'.repeat(5000) };
  const text = auditValue(big);
  const stored = JSON.parse(text);
  assert.equal(stored.truncated, true);
  assert.equal(stored.length, JSON.stringify(big).length);
  assert.equal(stored.preview.length, AUDIT_VALUE_LIMIT);
  assert.equal(stored.preview, JSON.stringify(big).slice(0, AUDIT_VALUE_LIMIT));
  const db = fakeDb();
  await writeAudit(db, { actor: { type: 'user', id: 'u1' }, action: 'update', entity: 'note', before: big, after: { ok: 1 } });
  assert.equal(JSON.parse(db.calls[0].values[8]).truncated, true);
  assert.equal(db.calls[0].values[9], '{"ok":1}');
});

test('a value at the limit is kept whole, and a cut never splits a surrogate pair', () => {
  const exact = 'y'.repeat(AUDIT_VALUE_LIMIT - 2);
  assert.equal(auditValue(exact), JSON.stringify(exact));
  const emoji = `${'z'.repeat(AUDIT_VALUE_LIMIT - 2)}😀tail`;
  const stored = JSON.parse(auditValue(emoji));
  assert.equal(stored.truncated, true);
  assert.doesNotMatch(stored.preview, /[\ud800-\udbff]$/);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(stored)));
});

test('omit drops the listed keys at any depth, before and after the size check', async () => {
  assert.equal(auditValue({ title: 'a', body: 'secret', nested: [{ body: 'more', id: 1 }] }, ['body']), '{"title":"a","nested":[{"id":1}]}');
  assert.equal(auditValue({ body: 'x'.repeat(5000), id: 3 }, ['body']), '{"id":3}');
  const db = fakeDb();
  await writeAudit(db, { actor: { type: 'user', id: 'u1' }, action: 'update', entity: 'note', before: { body: 'old', id: 1 }, after: { body: 'new', id: 1 }, omit: ['body'] });
  assert.deepEqual(db.calls[0].values.slice(8, 10), ['{"id":1}', '{"id":1}']);
});

test('undefined and a function stay null', () => {
  assert.equal(auditValue(undefined), null);
  assert.equal(auditValue(() => 1), null);
});
