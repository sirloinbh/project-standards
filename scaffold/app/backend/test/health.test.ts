import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';

// A stand-in pool: these tests check routing and error shapes without a database.
function fakePool(query: () => Promise<unknown>) {
  return { query } as unknown as Pool;
}

async function get(pool: Pool, path: string) {
  const server = createApp(pool).listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: (await res.json()) as unknown };
  } finally {
    server.close();
  }
}

test('GET /api/health answers ok when the database responds', async () => {
  const res = await get(
    fakePool(async () => ({ rows: [] })),
    '/api/health',
  );
  assert.deepEqual(res, { status: 200, body: { status: 'ok' } });
});

test('GET /api/health reports a Korean error when the database is down', async () => {
  const res = await get(
    fakePool(async () => {
      throw new Error('connect ECONNREFUSED');
    }),
    '/api/health',
  );
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: '저장소에 연결할 수 없습니다. 서버 상태를 확인하세요.' });
});
