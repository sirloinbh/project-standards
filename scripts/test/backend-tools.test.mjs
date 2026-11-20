// Tests the managed backend file templates/app/backend/src/standard/tools.ts (#559): the signed call token, the scope
// check, the audit row of every call, and the transaction of a write tool. Node strips the types; a resolve hook maps
// the template's `./audit.js` import to audit.ts, as tsc's output would.
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('./') && specifier.endsWith('.js') && context.parentURL?.includes('/templates/app/backend/src/')) {
      return next(specifier.replace(/\.js$/, '.ts'), context);
    }
    return next(specifier, context);
  },
});
const { defineTool, describeTool, MAX_TOKEN_SECONDS, registerToolRoutes, verifyCallToken } = await import(
  '../../templates/app/backend/src/standard/tools.ts'
);

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const other = generateKeyPairSync('ed25519').privateKey;

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(claims = {}, { key = privateKey, alg = 'EdDSA' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg, typ: 'JWT' })}.${b64({ iss: 'shared-ai', aud: 'demo', sub: 'owner-1', client: 'ai-shell', scope: 'demo:read demo:write', iat: now, exp: now + 60, ...claims })}`;
  return `${body}.${sign(null, Buffer.from(body), key).toString('base64url')}`;
}

// A Standard Schema like Zod 4's, without Zod.
const schema = (check) => ({
  '~standard': {
    validate: (value) => (check(value) ? { value } : { issues: [{ message: 'Enter a title' }] }),
    jsonSchema: { input: () => ({ type: 'object', properties: { title: { type: 'string' } } }) },
  },
});

function fakePool({ failAudit = false, failRollback = false } = {}) {
  const log = [];
  const client = {
    query: async (text, values) => {
      log.push({ on: 'client', text, values });
      if (failRollback && text === 'ROLLBACK') throw new Error('connection lost');
      if (/INSERT INTO items/.test(text) && values[0] === 'boom') throw new Error('insert failed');
      return { rows: [{ id: 9 }] };
    },
    release: (destroy) => log.push({ on: 'client', text: destroy ? 'release:destroy' : 'release' }),
  };
  return {
    log,
    query: async (text, values) => {
      log.push({ on: 'pool', text, values });
      if (failAudit && /INSERT INTO audit_log/.test(text)) throw new Error('relation audit_log does not exist');
      return { rows: [{ id: 1, title: 'a' }] };
    },
    connect: async () => client,
  };
}

const tools = [
  defineTool({
    name: 'list_items',
    description: 'List items',
    input: schema(() => true),
    access: 'read',
    action: 'read',
    entity: 'item',
    run: async (_input, { db }) => ({ result: (await db.query('SELECT * FROM items')).rows }),
  }),
  defineTool({
    name: 'add_item',
    description: 'Add an item',
    input: schema((v) => typeof v?.title === 'string'),
    access: 'write',
    action: 'create',
    entity: 'item',
    run: async (input, { db }) => {
      const { rows } = await db.query('INSERT INTO items(title) VALUES($1) RETURNING id', [input.title]);
      return { result: { id: rows[0].id }, entityId: rows[0].id, after: { title: input.title } };
    },
  }),
];

function setup(publicKeyPem = publicPem, extra = {}, poolOptions = {}) {
  const routes = {};
  const app = { get: (path, h) => (routes[`GET ${path}`] = h), post: (path, h) => (routes[`POST ${path}`] = h) };
  const pool = fakePool(poolOptions);
  registerToolRoutes(app, { app: 'demo', tools, pool, publicKey: publicKeyPem, ...extra });
  const call = async (route, { auth, name, body } = {}) => {
    const req = { params: { name }, body, get: (h) => (h.toLowerCase() === 'authorization' ? auth : undefined) };
    const res = { statusCode: 200, body: undefined, locals: { requestId: 'req-7' } };
    res.status = (code) => ((res.statusCode = code), res);
    res.json = (value) => ((res.body = value), res);
    let passed;
    await routes[route](req, res, (err) => (passed = err));
    return { status: res.statusCode, body: res.body, passed };
  };
  return { routes, pool, call };
}
const audits = (pool) => pool.log.filter((q) => /INSERT INTO audit_log/.test(q.text ?? ''));

test('without the public key no routes are registered', () => {
  assert.deepEqual(setup('').routes, {});
});

test('the tool list needs a valid token and describes scopes, schemas and hints', async () => {
  const { call } = setup();
  assert.equal((await call('GET /internal/tools')).status, 401);
  const listed = await call('GET /internal/tools', { auth: `Bearer ${token()}` });
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.tools.map((t) => [t.name, t.scope, t.annotations.readOnlyHint]), [
    ['list_items', 'demo:read', true],
    ['add_item', 'demo:write', false],
  ]);
  assert.deepEqual(describeTool(tools[0], 'demo').inputSchema, { type: 'object', properties: { title: { type: 'string' } } });
});

test('a missing, badly signed, wrong-audience, expired or too-long token is a 401', async () => {
  const { call, pool } = setup();
  const now = Math.floor(Date.now() / 1000);
  for (const auth of [
    undefined,
    'Bearer nope',
    `Bearer ${token({}, { key: other })}`,
    `Bearer ${token({}, { alg: 'none' })}`,
    `Bearer ${token({ aud: 'other-app' })}`,
    `Bearer ${token({ iss: 'someone' })}`,
    `Bearer ${token({ iat: now - 400, exp: now - 100 })}`,
    `Bearer ${token({ exp: now + MAX_TOKEN_SECONDS + 60 })}`,
    `Bearer ${token({ sub: '' })}`,
    `Bearer ${b64(null)}.${b64(null)}.AAAA`,
    `Bearer ${token().split('.').slice(0, 2).join('.')}.%%%`,
  ]) {
    assert.equal((await call('POST /internal/tools/:name', { auth, name: 'list_items', body: {} })).status, 401, auth);
  }
  assert.equal(audits(pool).length, 0, 'an unauthenticated call writes no row');
});

test('a call without the scope is a 403 with a denied audit row', async () => {
  const { call, pool } = setup();
  const result = await call('POST /internal/tools/:name', { auth: `Bearer ${token({ scope: 'demo:read' })}`, name: 'add_item', body: { title: 'x' } });
  assert.equal(result.status, 403);
  const [row] = audits(pool);
  assert.deepEqual(row.values.slice(0, 8), ['ai-tool', 'owner-1', 'ai-shell', 'add_item', 'create', 'item', null, 'denied']);
  assert.equal(row.values[10], 'req-7');
});

test('a read tool answers and writes a read row; an unknown tool is a 404', async () => {
  const { call, pool } = setup();
  const result = await call('POST /internal/tools/:name', { auth: `Bearer ${token({ scope: 'demo:read' })}`, name: 'list_items', body: {} });
  assert.deepEqual([result.status, result.body], [200, { result: [{ id: 1, title: 'a' }] }]);
  assert.deepEqual(audits(pool).map((q) => [q.on, q.values[4], q.values[7]]), [['pool', 'read', 'ok']]);
  assert.equal((await call('POST /internal/tools/:name', { auth: `Bearer ${token()}`, name: 'drop_all', body: {} })).status, 404);
});

test('a write tool runs in one transaction with its audit row', async () => {
  const { call, pool } = setup();
  const result = await call('POST /internal/tools/:name', { auth: `Bearer ${token()}`, name: 'add_item', body: { title: 'Squat' } });
  assert.deepEqual([result.status, result.body], [200, { result: { id: 9 } }]);
  assert.deepEqual(
    pool.log.map((q) => `${q.on}:${q.text.split(/[ (]/)[0]}`),
    ['client:BEGIN', 'client:INSERT', 'client:INSERT', 'client:COMMIT', 'client:release'],
  );
  assert.deepEqual(audits(pool)[0].values.slice(4, 10), ['create', 'item', '9', 'ok', null, '{"title":"Squat"}']);
});

test('invalid input is a 400 and a failing write rolls back, each with an error row', async () => {
  const { call, pool } = setup();
  const invalid = await call('POST /internal/tools/:name', { auth: `Bearer ${token()}`, name: 'add_item', body: { title: 3 } });
  assert.deepEqual([invalid.status, invalid.body], [400, { error: 'Enter a title' }]);
  const failed = await call('POST /internal/tools/:name', { auth: `Bearer ${token()}`, name: 'add_item', body: { title: 'boom' } });
  assert.match(failed.passed.message, /insert failed/);
  assert.ok(pool.log.some((q) => q.text === 'ROLLBACK'));
  assert.deepEqual(audits(pool).map((q) => [q.on, q.values[7]]), [['pool', 'error'], ['pool', 'error']]);
});

test('verifyCallToken returns the caller and its scopes', () => {
  const now = Math.floor(Date.now() / 1000);
  assert.deepEqual(verifyCallToken(token({ iat: now, exp: now + 60, jti: 'a', tool: 'list_items' }), publicKey, 'demo'), {
    owner: 'owner-1',
    client: 'ai-shell',
    scopes: ['demo:read', 'demo:write'],
    jti: 'a',
    tool: 'list_items',
    exp: now + 60,
  });
  assert.deepEqual(verifyCallToken(token(), publicKey, 'demo').tool, null);
});

test('tool names must be <verb>_<noun> and unique', () => {
  const app = { get() {}, post() {} };
  const bad = (name) => () => registerToolRoutes(app, { app: 'demo', tools: [{ ...tools[0], name }], pool: fakePool(), publicKey: publicPem });
  assert.throws(bad('ListItems'), /Invalid or repeated tool name/);
  assert.throws(bad('list'), /Invalid or repeated tool name/);
  assert.throws(() => registerToolRoutes(app, { app: 'demo', tools: [tools[0], tools[0]], pool: fakePool(), publicKey: publicPem }), /repeated/);
});

const POST = 'POST /internal/tools/:name';
const bound = (tool, jti, claims = {}) => `Bearer ${token({ tool, jti, scope: 'demo:read demo:write', ...claims })}`;

test('a bound token works once: replaying it is a 401 and writes no row', async () => {
  const { call, pool } = setup();
  const auth = bound('add_item', 'jti-1');
  assert.equal((await call(POST, { auth, name: 'add_item', body: { title: 'x' } })).status, 200);
  const replay = await call(POST, { auth, name: 'add_item', body: { title: 'x' } });
  assert.deepEqual([replay.status, replay.body], [401, { error: 'Call token was already used' }]);
  assert.equal(audits(pool).length, 1);
  assert.equal((await call(POST, { auth: bound('add_item', 'jti-2'), name: 'add_item', body: { title: 'x' } })).status, 200);
});

test('a token for another tool is a 401 and does not use up its jti', async () => {
  const { call } = setup();
  const auth = bound('list_items', 'jti-3');
  const wrong = await call(POST, { auth, name: 'add_item', body: { title: 'x' } });
  assert.deepEqual([wrong.status, wrong.body], [401, { error: 'Call token is not for this tool' }]);
  assert.equal((await call(POST, { auth, name: 'list_items', body: {} })).status, 200);
});

test('the tool list token is bound to the list, not to a tool', async () => {
  const { call } = setup();
  assert.equal((await call('GET /internal/tools', { auth: bound('add_item', 'jti-4') })).status, 401);
  assert.equal((await call('GET /internal/tools', { auth: bound('@list', 'jti-5') })).status, 200);
  assert.equal((await call(POST, { auth: bound('@list', 'jti-6'), name: 'list_items', body: {} })).status, 401);
});

test('a malformed jti or tool claim is a 401', async () => {
  const { call } = setup();
  for (const claims of [{ jti: 5, tool: 'list_items' }, { jti: '', tool: 'list_items' }, { jti: 'j', tool: 7 }]) {
    assert.equal((await call(POST, { auth: `Bearer ${token(claims)}`, name: 'list_items', body: {} })).status, 401);
  }
});

test('a token without the binding claims passes only until requireBinding is set', async () => {
  const old = `Bearer ${token()}`;
  const lenient = setup();
  assert.equal((await lenient.call(POST, { auth: old, name: 'list_items', body: {} })).status, 200);
  assert.equal((await lenient.call(POST, { auth: old, name: 'list_items', body: {} })).status, 200, 'old tokens are not tracked');
  const strict = setup(publicPem, { requireBinding: true });
  const refused = await strict.call(POST, { auth: old, name: 'list_items', body: {} });
  assert.deepEqual([refused.status, refused.body], [401, { error: 'Call token is not bound to one call' }]);
  assert.equal((await strict.call(POST, { auth: bound('list_items', 'jti-7'), name: 'list_items', body: {} })).status, 200);
});

test('seen jti values are forgotten after their expiry', async () => {
  const { createSeenTokens } = await import('../../templates/app/backend/src/standard/tools.ts');
  const seen = createSeenTokens();
  const t0 = 1_000_000_000_000;
  assert.equal(seen.use('a', t0 / 1000 + 60, t0), true);
  assert.equal(seen.use('a', t0 / 1000 + 60, t0 + 60_000), false);
  assert.equal(seen.use('a', t0 / 1000 + 60, t0 + 100_000), true);
});

test('a broken audit table does not change a 403, a 400 or a read answer; each failure is logged', async () => {
  const logged = [];
  const { call } = setup(publicPem, { log: (message) => logged.push(message) }, { failAudit: true });
  const denied = await call(POST, { auth: bound('add_item', 'f-1', { scope: 'demo:read' }), name: 'add_item', body: { title: 'x' } });
  assert.equal(denied.status, 403);
  const invalid = await call(POST, { auth: bound('add_item', 'f-2'), name: 'add_item', body: { title: 3 } });
  assert.deepEqual([invalid.status, invalid.body], [400, { error: 'Enter a title' }]);
  const read = await call(POST, { auth: bound('list_items', 'f-3'), name: 'list_items', body: {} });
  assert.deepEqual([read.status, read.body], [200, { result: [{ id: 1, title: 'a' }] }]);
  assert.equal(logged.length, 3);
});

test('a write whose audit row cannot be written rolls back and fails, it is never done unaudited', async () => {
  const { call, pool } = setup();
  const original = pool.connect;
  pool.connect = async () => {
    const client = await original();
    const query = client.query;
    client.query = async (text, values) => {
      if (/INSERT INTO audit_log/.test(text)) throw new Error('audit insert failed');
      return query(text, values);
    };
    return client;
  };
  const result = await call(POST, { auth: bound('add_item', 'f-4'), name: 'add_item', body: { title: 'x' } });
  assert.match(result.passed.message, /audit insert failed/);
  assert.ok(pool.log.some((q) => q.text === 'ROLLBACK'));
});

test('a failing ROLLBACK keeps the original error, destroys the client, and still records the error row', async () => {
  const { call, pool } = setup(publicPem, {}, { failRollback: true });
  const failed = await call(POST, { auth: bound('add_item', 'f-5'), name: 'add_item', body: { title: 'boom' } });
  assert.match(failed.passed.message, /insert failed/);
  assert.ok(pool.log.some((q) => q.text === 'release:destroy'));
  assert.deepEqual(audits(pool).map((q) => [q.on, q.values[7]]), [['pool', 'error']]);
});
