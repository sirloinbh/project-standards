// Tests the managed frontend file templates/ui/frontend/src/lib/api.ts (#310) in the central repository.
// Apps run the same cases with Vitest (templates/ui/frontend/src/lib/api.test.ts); Node strips the types here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestError, requestJson } from '../../templates/ui/frontend/src/lib/api.ts';

async function withFetch(fake, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}
const reply = (status, body) => async () => new Response(body === undefined ? null : JSON.stringify(body), { status });

test('sends a JSON body and returns the reply body; 204 gives undefined', async () => {
  const calls = [];
  const fake = async (...args) => {
    calls.push(args);
    return new Response(JSON.stringify({ item: { id: 1 } }), { status: 201 });
  };
  assert.deepEqual(await withFetch(fake, () => requestJson('/api/items', { method: 'POST', body: { name: '책' } })), { item: { id: 1 } });
  assert.deepEqual(calls, [['/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"책"}' }]]);
  assert.equal(await withFetch(reply(204), () => requestJson('/api/items/1', { method: 'DELETE' })), undefined);
});

test("rejects with the server's Korean message and status, or a fixed message", async () => {
  const notFound = await withFetch(reply(404, { error: '교재를 찾을 수 없습니다' }), () => requestJson('/api/items/9').catch((e) => e));
  assert.ok(notFound instanceof RequestError);
  assert.deepEqual([notFound.message, notFound.status, notFound.name], ['교재를 찾을 수 없습니다', 404, 'RequestError']);
  const html = await withFetch(async () => new Response('<html>Bad Gateway</html>', { status: 502 }), () => requestJson('/api/items').catch((e) => e));
  assert.deepEqual([html.message, html.status], ['요청을 처리하지 못했습니다', 502]);
  const down = await withFetch(async () => { throw new TypeError('Failed to fetch'); }, () => requestJson('/api/items').catch((e) => e));
  assert.deepEqual([down.message, down.status], ['서버에 연결할 수 없습니다', undefined]);
});
