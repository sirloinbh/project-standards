// Tests the managed frontend file templates/ui/frontend/src/lib/api.ts (#310) in the central repository.
// Apps run the same cases with Vitest (templates/ui/frontend/src/lib/api.test.ts); Node strips the types here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestError, requestForm, requestJson } from '../../templates/ui/frontend/src/lib/api.ts';

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
  assert.deepEqual(await withFetch(fake, () => requestJson('/api/items', { method: 'POST', body: { name: 'Book' } })), { item: { id: 1 } });
  const [[path, init]] = calls;
  assert.equal(path, '/api/items');
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual({ ...init, signal: undefined }, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"Book"}', signal: undefined });
  assert.equal(await withFetch(reply(204), () => requestJson('/api/items/1', { method: 'DELETE' })), undefined);
});

test("rejects with the server's message and status, or a fixed message", async () => {
  const notFound = await withFetch(reply(404, { error: 'Textbook not found' }), () => requestJson('/api/items/9').catch((e) => e));
  assert.ok(notFound instanceof RequestError);
  assert.deepEqual([notFound.message, notFound.status, notFound.name], ['Textbook not found', 404, 'RequestError']);
  const html = await withFetch(async () => new Response('<html>Bad Gateway</html>', { status: 502 }), () => requestJson('/api/items').catch((e) => e));
  assert.deepEqual([html.message, html.status], ['Could not process the request', 502]);
  const down = await withFetch(async () => { throw new TypeError('Failed to fetch'); }, () => requestJson('/api/items').catch((e) => e));
  assert.deepEqual([down.message, down.status], ['Cannot reach the server', undefined]);
});

test('a 2xx answer with an empty or non-JSON body rejects with kind body', async () => {
  const html = await withFetch(async () => new Response('<html>proxy</html>', { status: 200 }), () => requestJson('/api/items').catch((e) => e));
  assert.deepEqual([html.kind, html.status], ['body', 200]);
  const empty = await withFetch(reply(200), () => requestJson('/api/items').catch((e) => e));
  assert.deepEqual([empty.kind, empty.status], ['body', 200]);
});

test('abort and timeout are their own error kinds', async () => {
  const hung = (_path, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const controller = new AbortController();
  const pending = withFetch(hung, () => requestJson('/api/items', { signal: controller.signal }).catch((e) => e));
  controller.abort();
  assert.equal((await pending).kind, 'abort');
  const slow = await withFetch(hung, () => requestJson('/api/items', { timeoutMs: 20 }).catch((e) => e));
  assert.equal(slow.kind, 'timeout');
});

test('requestForm sends the form without a content type, and headers are passed through', async () => {
  const calls = [];
  const fake = async (...args) => {
    calls.push(args);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const form = new FormData();
  form.append('file', new Blob(['a']), 'a.txt');
  assert.deepEqual(await withFetch(fake, () => requestForm('/api/upload', form)), { ok: true });
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].body, form);
  assert.equal(calls[0][1].headers, undefined);
  await withFetch(fake, () => requestJson('/api/items', { headers: { 'x-trace': '1' } }));
  assert.deepEqual(calls[1][1].headers, { 'x-trace': '1' });
});
