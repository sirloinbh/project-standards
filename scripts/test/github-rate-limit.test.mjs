import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createClient, mapLimit, retryDelay } from '../lib/github-app.mjs';
import { loadAll } from '../lib/registry.mjs';
import { rateLimitedRepos, remoteStatuses } from '../compliance.mjs';

// GitHub rate limits in the sync and compliance scripts (#464): wait as told, retry a few times, fetch a few at a time,
// and never publish a compliance report whose rows were lost to a rate limit.
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const SECONDARY = { message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.' };

test('the retry delay follows retry-after, then the reset time, then a doubling backoff', () => {
  const now = 1_000_000_000_000;
  assert.equal(retryDelay(json(403, SECONDARY, { 'retry-after': '7' }), SECONDARY.message, 0, now), 7000);
  assert.equal(retryDelay(json(403, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(now / 1000 + 30) }), 'API rate limit exceeded', 0, now), 31_000);
  assert.equal(retryDelay(json(403, SECONDARY), SECONDARY.message, 0, now), 60_000);
  assert.equal(retryDelay(json(403, SECONDARY), SECONDARY.message, 2, now), 240_000);
  assert.equal(retryDelay(json(429, {}), '', 1, now), 120_000);
  assert.equal(retryDelay(json(403, { message: 'Resource not accessible by integration' }), 'Resource not accessible by integration', 0, now), null, 'a permission 403 is not retried');
  assert.equal(retryDelay(json(500, {}), '', 0, now), null);
});

test('the client waits and retries a rate-limited call, then succeeds', async () => {
  const waits = [];
  let calls = 0;
  const fetchImpl = async () => (++calls < 3 ? json(403, SECONDARY, { 'retry-after': '2' }) : json(200, { ok: true }));
  const api = createClient({ token: 't', fetchImpl, sleep: async (ms) => waits.push(ms) });
  assert.deepEqual(await api('GET', '/repos/a/b'), { ok: true });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [2000, 2000]);
});

test('the client gives up after the retry cap and on waits that are too long, with the original error', async () => {
  let calls = 0;
  const limited = createClient({ token: 'ghs_secret', fetchImpl: async () => (calls++, json(403, SECONDARY)), sleep: async () => {} });
  await assert.rejects(limited('GET', '/x'), (e) => /failed: 403 You have exceeded a secondary rate limit/.test(e.message) && !e.message.includes('ghs_secret'));
  assert.equal(calls, 4, 'one call and three retries');
  const longWait = createClient({ token: 't', fetchImpl: async () => json(429, {}, { 'retry-after': '3600' }), sleep: async () => assert.fail('must not wait an hour') });
  await assert.rejects(longWait('GET', '/x'), /failed: 429/);
  let once = 0;
  const forbidden = createClient({ token: 't', fetchImpl: async () => (once++, json(403, { message: 'Resource not accessible by integration' })), sleep: async () => assert.fail('no retry') });
  await assert.rejects(forbidden('GET', '/x'), /403 Resource not accessible/);
  assert.equal(once, 1);
});

test('mapLimit keeps the order and never runs more than the limit at once', async () => {
  let running = 0;
  let peak = 0;
  const result = await mapLimit([5, 1, 4, 2, 3, 0, 6], async (n) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, n));
    running--;
    return n * 10;
  }, 3);
  assert.deepEqual(result, [50, 10, 40, 20, 30, 0, 60]);
  assert.equal(peak, 3);
  assert.deepEqual(await mapLimit([], async () => 1), []);
});

test('statuses lost to a rate limit are marked so the report is not published', async () => {
  const { data } = loadAll(fileURLToPath(new URL('../..', import.meta.url)));
  const getClient = async (repo) => {
    if (repo === 'sirloinbh/study-log') throw new Error(`GitHub API GET /repos/${repo}/git/blobs/abc failed: 403 ${SECONDARY.message}`);
    throw new Error('the sync App is not installed');
  };
  const statuses = await remoteStatuses({ data, getClient, now: new Date('2026-11-11T00:00:00Z') });
  assert.deepEqual(rateLimitedRepos(statuses), ['sirloinbh/study-log']);
  assert.deepEqual(rateLimitedRepos([{ repo: 'a', unknown: 'the sync App is not installed' }]), [], 'other errors still publish as unknown rows');
});
