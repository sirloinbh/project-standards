import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { createAuthMiddleware } from '@sirloinbh/auth-client';
import type { Pool } from 'pg';

import { createApp } from '../src/app.js';

// The shared sign-in guards /api (ADR-0015). A fake auth service stands in for sirloinbh/shared-auth
// and a fake pool for PostgreSQL, so these run without either.
const user = { id: 'u1', email: 'me@example.com', name: 'Me', image: null };

async function get(path: string, cookie?: string) {
  const auth = createAuthMiddleware({
    authUrl: 'http://shared-auth-api:3110',
    fetch: async (_url, init) => {
      const sent = (init?.headers as Record<string, string> | undefined)?.cookie ?? '';
      const ok = sent.includes('sirloinbh.session_token=good');
      return { ok: true, status: 200, json: async () => (ok ? { user } : null) };
    },
  });
  const pool = { query: async () => ({ rows: [] }) } as unknown as Pool;
  const server = createApp(pool, { auth }).listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const init = cookie ? { headers: { cookie } } : {};
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: res.status, body: (await res.json()) as unknown };
  } finally {
    server.close();
  }
}

test('without a session /api answers 401, except /api/health', async () => {
  assert.equal((await get('/api/health')).status, 200);
  assert.deepEqual(await get('/api/me'), { status: 401, body: { error: 'unauthorized' } });
  assert.equal((await get('/api/missing')).status, 401);
  assert.equal((await get('/api/me', 'sirloinbh.session_token=bad')).status, 401);
});

test('with a session /api/me returns the signed-in user', async () => {
  const res = await get('/api/me', 'sirloinbh.session_token=good');
  assert.deepEqual(res, { status: 200, body: { user } });
});
