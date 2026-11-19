// Tests the managed backend file templates/app/backend/src/standard/db.ts (#676): the pool error listener and the
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

test('createPool adds an error listener that logs instead of crashing', () => {
  const pool = fakePool();
  const seen = [];
  assert.equal(createPool(pool, (message, err) => seen.push([message, err.message])), pool);
  assert.equal(pool.listeners[0][0], 'error');
  pool.listeners[0][1](new Error('lost'));
  assert.deepEqual(seen, [['Idle database client failed', 'lost']]);
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
