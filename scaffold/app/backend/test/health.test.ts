import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';

// A stand-in pool: these tests check routing and error shapes without a database.
function fakePool(query: () => Promise<unknown>) {
  return { query } as unknown as Pool;
}

async function get(pool: Pool, path: string, init?: RequestInit) {
  const server = createApp(pool).listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
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

test('an unknown /api path answers 404 in the shared error shape', async () => {
  const res = await get(
    fakePool(async () => ({ rows: [] })),
    '/api/missing',
  );
  assert.deepEqual(res, { status: 404, body: { error: '요청한 API를 찾을 수 없습니다' } });
});

test('a malformed JSON body answers 400 in the shared error shape', async () => {
  const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' };
  const res = await get(
    fakePool(async () => ({ rows: [] })),
    '/api/health',
    init,
  );
  assert.deepEqual(res, {
    status: 400,
    body: { error: '요청 본문의 JSON 형식이 올바르지 않습니다' },
  });
});
