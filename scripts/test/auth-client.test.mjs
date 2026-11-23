import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthMiddleware, createUseUser, fetchUser, meHandler, sessionCookies, signInUrl, signOutUrl } from '../../packages/auth-client/index.mjs';

const USER = { id: 'u1', email: 'owner@example.com', name: 'Owner', image: null };

// A fake auth service: answers get-session from a table of tokens and records every call.
function fakeAuth(sessions = { good: USER }) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, cookie: init.headers.cookie, ...(init.headers['x-request-id'] ? { requestId: init.headers['x-request-id'] } : {}) });
    if (fetch.down) throw new Error('connect ECONNREFUSED');
    if (fetch.status) return { ok: false, status: fetch.status, json: async () => ({}) };
    const token = /session_token=([^;]+)/.exec(init.headers.cookie)?.[1];
    return { ok: true, status: 200, json: async () => (sessions[token] ? { user: sessions[token], session: {} } : null) };
  };
  return { fetch, calls };
}

// Runs the middleware once and reports what it did.
async function call(middleware, { url = '/api/sets', cookie, requestId } = {}) {
  const req = { originalUrl: url, headers: cookie ? { cookie } : {} };
  const out = { next: false, status: null, body: null, user: undefined };
  const res = {
    locals: requestId === undefined ? {} : { requestId },
    status(code) {
      out.status = code;
      return res;
    },
    json(body) {
      out.body = body;
    },
  };
  await middleware(req, res, () => {
    out.next = true;
  });
  out.user = req.user;
  return out;
}

test('a valid shared session sets req.user and forwards only the session cookies', async () => {
  const { fetch, calls } = fakeAuth();
  const mw = createAuthMiddleware({ authUrl: 'http://shared-auth-api:3110/', fetch });
  const out = await call(mw, { cookie: 'theme=dark; __Secure-sirloinbh.session_token=good; workout_x=1' });
  assert.equal(out.next, true);
  assert.deepEqual(out.user, USER);
  assert.deepEqual(calls, [{ url: 'http://shared-auth-api:3110/api/auth/get-session', cookie: '__Secure-sirloinbh.session_token=good' }]);
});

test('no session cookie, or a session the auth service rejects, gets 401', async () => {
  const { fetch, calls } = fakeAuth();
  const mw = createAuthMiddleware({ authUrl: 'http://auth', fetch });
  assert.deepEqual(await call(mw, { cookie: 'theme=dark' }), { next: false, status: 401, body: { error: 'unauthorized' }, user: undefined });
  assert.equal(calls.length, 0, 'no call without a session cookie');
  const out = await call(mw, { cookie: 'sirloinbh.session_token=expired' });
  assert.deepEqual([out.next, out.status], [false, 401]);
});

test('an unreachable or failing auth service gets 503, never a pass', async () => {
  const { fetch } = fakeAuth();
  const mw = createAuthMiddleware({ authUrl: 'http://auth', fetch });
  fetch.down = true;
  assert.deepEqual(await call(mw, { cookie: 'sirloinbh.session_token=good' }), { next: false, status: 503, body: { error: 'auth_unavailable' }, user: undefined });
  fetch.down = false;
  fetch.status = 500;
  assert.equal((await call(mw, { cookie: 'sirloinbh.session_token=good' })).status, 503);
});

test('successful checks are cached for cacheMs; failures are not', async () => {
  let clock = 1_000;
  const { fetch, calls } = fakeAuth();
  const mw = createAuthMiddleware({ authUrl: 'http://auth', fetch, cacheMs: 30_000, now: () => clock });
  await call(mw, { cookie: 'sirloinbh.session_token=good' });
  clock += 29_999;
  assert.equal((await call(mw, { cookie: 'sirloinbh.session_token=good' })).next, true);
  assert.equal(calls.length, 1, 'second request served from the cache');
  clock += 2;
  await call(mw, { cookie: 'sirloinbh.session_token=good' });
  assert.equal(calls.length, 2, 'checked again after cacheMs');
  await call(mw, { cookie: 'sirloinbh.session_token=bad' });
  await call(mw, { cookie: 'sirloinbh.session_token=bad' });
  assert.equal(calls.length, 4, 'a rejected session is asked every time');
});

test('public paths such as the health check need no session', async () => {
  const { fetch, calls } = fakeAuth();
  const mw = createAuthMiddleware({ authUrl: 'http://auth', fetch });
  assert.equal((await call(mw, { url: '/api/health?x=1' })).next, true);
  assert.equal((await call(mw, { url: '/api/healthz' })).status, 401, 'only the exact path or its children');
  assert.equal(calls.length, 0);
  assert.throws(() => createAuthMiddleware({ fetch }), /authUrl is required/);
});

test('sessionCookies keeps only the shared session cookies', () => {
  assert.equal(sessionCookies('a=1; sirloinbh.session_data=d; x.sirloinbh.session_token=no; sirloinbh.session_token=t'), 'sirloinbh.session_data=d; sirloinbh.session_token=t');
  assert.equal(sessionCookies(undefined), '');
});

test('meHandler returns req.user; fetchUser maps the answer to a status', async () => {
  let sent;
  meHandler({ user: USER }, { json: (b) => (sent = b) });
  assert.deepEqual(sent, { user: USER });
  const answer = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
  assert.deepEqual(await fetchUser({ fetch: answer(200, { user: USER }) }), { status: 'signed-in', user: USER });
  assert.deepEqual(await fetchUser({ fetch: answer(401, {}) }), { status: 'signed-out', user: null });
  assert.deepEqual(await fetchUser({ fetch: answer(503, {}) }), { status: 'error', user: null });
  assert.deepEqual(await fetchUser({ fetch: async () => { throw new Error('offline'); } }), { status: 'error', user: null });
});

test('sign-in and sign-out links point at the auth service and carry the return address', () => {
  assert.equal(signInUrl('https://auth.daysofme.com/', 'https://workout-memo.daysofme.com/logs?a=1'), 'https://auth.daysofme.com/sign-in?returnTo=https%3A%2F%2Fworkout-memo.daysofme.com%2Flogs%3Fa%3D1');
  assert.equal(signOutUrl('https://auth.daysofme.com', 'https://workout-memo.daysofme.com'), 'https://auth.daysofme.com/sign-out?returnTo=https%3A%2F%2Fworkout-memo.daysofme.com');
});

test('useUser starts loading, then shows the fetched state; a late answer after unmount is dropped', async () => {
  // Minimal stand-ins for React's hooks: one state slot and one effect.
  const run = (fetch) => {
    let state;
    let cleanup;
    const useState = (initial) => [state ?? (state = initial), (next) => (state = next)];
    const useEffect = (effect) => {
      cleanup = effect();
    };
    const useUser = createUseUser({ useState, useEffect });
    const first = useUser({ fetch });
    return { first, read: () => state, unmount: () => cleanup() };
  };
  const ok = async () => ({ ok: true, status: 200, json: async () => ({ user: USER }) });
  const mounted = run(ok);
  assert.deepEqual(mounted.first, { status: 'loading', user: null });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(mounted.read(), { status: 'signed-in', user: USER });

  const gone = run(ok);
  gone.unmount();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(gone.read(), { status: 'loading', user: null });
});

test('the request ID goes to the auth service as X-Request-Id when it is valid (#1082)', async () => {
  const { fetch, calls } = fakeAuth();
  const auth = createAuthMiddleware({ authUrl: 'http://auth', fetch, cacheMs: 0 });
  await call(auth, { cookie: 'sirloinbh.session_token=good', requestId: '5f0c-ab.1_x' });
  assert.equal(calls[0].requestId, '5f0c-ab.1_x');
});

test('no X-Request-Id without an ID, and an invalid ID is not forwarded (#1082)', async () => {
  const { fetch, calls } = fakeAuth();
  const auth = createAuthMiddleware({ authUrl: 'http://auth', fetch, cacheMs: 0 });
  await call(auth, { cookie: 'sirloinbh.session_token=good' });
  await call(auth, { cookie: 'sirloinbh.session_token=good', requestId: 'bad id\r\nx: y' });
  await call(auth, { cookie: 'sirloinbh.session_token=good', requestId: 'a'.repeat(129) });
  assert.deepEqual(calls.map((c) => c.requestId), [undefined, undefined, undefined]);
});
