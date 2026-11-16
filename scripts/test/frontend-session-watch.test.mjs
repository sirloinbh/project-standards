// Tests the managed frontend file templates/ui/frontend/src/session-watch.ts (#596) in the central repository.
// Apps run the same cases with Vitest (templates/ui/frontend/src/session-watch.test.ts); Node strips the types here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { watchSession } from '../../templates/ui/frontend/src/session-watch.ts';

const page = 'https://study-log.daysofme.com';
const answering = (status) => () => Promise.resolve(new Response(null, { status }));

test('the first 401 from the app API signs out once and still returns the response', async () => {
  let calls = 0;
  const watched = watchSession(answering(401), page, () => calls++);
  assert.equal((await watched('/api/logs')).status, 401);
  await watched(new URL('/api/logs/2', page), { method: 'DELETE' });
  await watched(new Request(`${page}/api/stats`));
  assert.equal(calls, 1);
});

test('other statuses, other paths and other origins are left alone', async () => {
  let calls = 0;
  await watchSession(answering(200), page, () => calls++)('/api/logs');
  await watchSession(answering(403), page, () => calls++)('/api/logs');
  await watchSession(answering(401), page, () => calls++)('/apiary');
  await watchSession(answering(401), page, () => calls++)('https://auth.daysofme.com/api/x');
  assert.equal(calls, 0);
});
