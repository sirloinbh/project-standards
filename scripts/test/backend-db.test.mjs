// Tests the managed backend file templates/app/backend/src/standard/db.ts (#676, #832): the pool and client error listeners and the
// transaction helper, including a failed ROLLBACK that destroys the connection.
import assert from 'node:assert/strict';
import test from 'node:test';

const { createPool, withTransaction } = await import('../../templates/app/backend/src/standard/db.ts');

function fakePool({ failOn } = {}) {
  const log = [];
  const client = {
    query: async (text) => {
      log.push(text);
      if (text === failOn) throw new Error(`${text} failed`);
      return {};
    },
    release: (destroy) => log.push(`release:${destroy}`),
  };
  const listeners = [];
  return { log, listeners, connect: async () => client, on: (event, fn) => listeners.push([event, fn]) };
}

test('createPool listens on the pool quietly and on every connected client, which logs', () => {
  const pool = fakePool();
  const seen = [];
  assert.equal(createPool(pool, (message, err) => seen.push([message, err.message])), pool);
  assert.deepEqual(pool.listeners.map(([event]) => event), ['error', 'connect']);
  // An idle client reports on the pool and on itself: the pool-level listener must not throw and must not log.
  pool.listeners[0][1](new Error('idle'));
  assert.deepEqual(seen, []);
  // A client in a transaction has only its own listener (pg removes the pool's while it is checked out).
  const clientListeners = [];
  pool.listeners[1][1]({ on: (event, fn) => clientListeners.push([event, fn]) });
  assert.equal(clientListeners[0][0], 'error');
  clientListeners[0][1](new Error('lost'));
  assert.deepEqual(seen, [['Database connection failed', 'lost']]);
});

test('the default log writes one parseable JSON line for a pool and a client error, and the process keeps running (#1003)', (t) => {
  const lines = [];
  t.mock.method(console, 'error', (line) => lines.push(line));
  const pool = fakePool();
  createPool(pool);
  // Idle client: the pool-level listener stays quiet, the client listener logs once.
  pool.listeners[0][1](Object.assign(new Error('idle'), { code: 'ECONNRESET' }));
  assert.deepEqual(lines, []);
  const clientListeners = [];
  pool.listeners[1][1]({ on: (event, fn) => clientListeners.push([event, fn]) });
  clientListeners[0][1](Object.assign(new Error('lost\nsecond line'), { code: 'ECONNRESET' }));
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /\n/);
  const entry = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(entry), ['time', 'level', 'message', 'error', 'code']);
  assert.equal(entry.level, 'error');
  assert.equal(entry.message, 'Database connection failed');
  assert.equal(entry.error, 'lost\nsecond line');
  assert.equal(entry.code, 'ECONNRESET');
  assert.ok(!Number.isNaN(Date.parse(entry.time)));
  // An error without a code has no code key.
  const plain = fakePool();
  createPool(plain);
  const plainListeners = [];
  plain.listeners[1][1]({ on: (event, fn) => plainListeners.push([event, fn]) });
  plainListeners[0][1](new Error('plain'));
  assert.ok(!('code' in JSON.parse(lines[1])));
});

test('withTransaction commits and returns the result', async () => {
  const pool = fakePool();
  assert.equal(await withTransaction(pool, async (client) => (await client.query('SELECT 1'), 'ok')), 'ok');
  assert.deepEqual(pool.log, ['BEGIN', 'SELECT 1', 'COMMIT', 'release:false']);
});

test('withTransaction rolls back, rethrows, and releases normally', async () => {
  const pool = fakePool();
  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('nope');
    }),
    /nope/,
  );
  assert.deepEqual(pool.log, ['BEGIN', 'ROLLBACK', 'release:false']);
});

test('withTransaction releases with true after a failed ROLLBACK and keeps the original error', async () => {
  const pool = fakePool({ failOn: 'ROLLBACK' });
  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('original');
    }),
    /original/,
  );
  assert.deepEqual(pool.log, ['BEGIN', 'ROLLBACK', 'release:true']);
});

test('withTransaction rolls back when COMMIT fails', async () => {
  const pool = fakePool({ failOn: 'COMMIT' });
  await assert.rejects(withTransaction(pool, async () => 1), /COMMIT failed/);
  assert.deepEqual(pool.log, ['BEGIN', 'COMMIT', 'ROLLBACK', 'release:false']);
});

const { INT8_OID, setInt8Parser } = await import('../../templates/app/backend/src/standard/db.ts');

function parser() {
  const set = [];
  setInt8Parser({ setTypeParser: (oid, fn) => set.push([oid, fn]) });
  assert.equal(set.length, 1);
  assert.equal(set[0][0], INT8_OID);
  assert.equal(INT8_OID, 20);
  return set[0][1];
}

test('setInt8Parser returns a number for a safe value and keeps the sign (#778)', () => {
  const parse = parser();
  assert.equal(parse('42'), 42);
  assert.equal(parse('-7'), -7);
  assert.equal(parse('9007199254740991'), Number.MAX_SAFE_INTEGER);
  assert.equal(parse('-9007199254740991'), Number.MIN_SAFE_INTEGER);
});

test('setInt8Parser throws above 2^53 instead of rounding (#778)', () => {
  const parse = parser();
  assert.throws(() => parse('9007199254740992'), /outside the safe integer range/);
  assert.throws(() => parse('9223372036854775807'), /9223372036854775807/);
  assert.throws(() => parse('-9007199254740992'), /outside the safe integer range/);
});
