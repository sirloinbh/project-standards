import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAll } from '../lib/registry.mjs';
import { classifyChecks, groupWaves, waitForChecks } from '../lib/sync-waves.mjs';
import { apply } from '../sync.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const t = (name, wave) => ({ repo: `sirloinbh/${name}`, profile: 'utility', project: null, ...(wave ? { wave } : {}) });
const run = (conclusion, status = 'completed') => ({ name: 'ci', status, conclusion });

// A fake world: every sync opens a PR; `checks[repo]` is the list of answers to the check-runs call, one per poll (the last one repeats).
function world({ checks = {}, failSync = [] } = {}) {
  const synced = [];
  const comments = [];
  const polls = {};
  const makeClient = (token) => async (method, p, body) => {
    const m = /^\/repos\/([^/]+\/[^/]+)\/commits\/.+\/check-runs/.exec(p);
    if (m) {
      const answers = checks[m[1]] ?? [[run('success')]];
      const i = polls[m[1]] = (polls[m[1]] ?? -1) + 1;
      return { check_runs: answers[Math.min(i, answers.length - 1)] };
    }
    if (method === 'POST' && /\/issues\/\d+\/comments$/.test(p)) comments.push(body.body);
    return null;
  };
  const syncTargetFn = async ({ target }) => {
    if (failSync.includes(target.repo)) throw new Error('boom');
    synced.push(target.repo);
    return { status: 'opened', pr: `https://x/${target.repo}`, branch: 'chore/standards-sync-abc', changes: [], deletions: [] };
  };
  return { synced, comments, polls, makeClient, syncTargetFn };
}

const base = (w, targets, extra = {}) => ({
  data, targets, centralSha: SHA, getToken: async (r) => r, makeClient: w.makeClient, syncTargetFn: w.syncTargetFn, labels: [], log: () => {},
  sleep: async () => {}, centralPr: () => 42, wait: { pollMs: 10, timeoutMs: 1000, noChecksGraceMs: 0 }, ...extra,
});
// labels sync needs a repo labels list; the fake returns null, so stub the label step through an empty label list.

test('groupWaves orders by wave and puts targets without a wave last', () => {
  const groups = groupWaves([t('c'), t('a', 1), t('b', 2), t('d', 1)]);
  assert.deepEqual(groups.map((g) => [g.label, g.targets.map((x) => x.repo.split('/')[1])]), [['1', ['a', 'd']], ['2', ['b']], ['last', ['c']]]);
});

test('the config puts workout-memo and file-control in wave 1 and the infra repo last', () => {
  const first = groupWaves(data.sync.targets);
  assert.deepEqual(first[0].targets.map((x) => x.repo), ['sirloinbh/workout-memo', 'sirloinbh/file-control']);
  assert.ok(first.at(-1).targets.some((x) => x.profile === 'infra'));
});

test('classifyChecks', () => {
  assert.equal(classifyChecks([]), 'none');
  assert.equal(classifyChecks([run('success'), run(null, 'in_progress')]), 'pending');
  assert.equal(classifyChecks([run('success'), run('skipped')]), 'green');
  assert.equal(classifyChecks([run('failure'), run(null, 'in_progress')]), 'red');
});

test('wave 2 is synced when every wave-1 sync PR passes CI', async () => {
  const w = world({ checks: { 'sirloinbh/a': [[run(null, 'in_progress')], [run('success')]] } });
  const results = await apply(base(w, [t('b', 2), t('a', 1)]));
  assert.deepEqual(w.synced, ['sirloinbh/a', 'sirloinbh/b']);
  assert.equal(results.find((r) => r.target === 'sirloinbh/a').checks, 'green');
  assert.equal(w.comments.length, 0);
});

test('wave 2 is not synced when a wave-1 sync PR fails CI; the central PR gets a comment', async () => {
  const w = world({ checks: { 'sirloinbh/a': [[run('failure')]] } });
  const results = await apply(base(w, [t('a', 1), t('b', 2), t('c')]));
  assert.deepEqual(w.synced, ['sirloinbh/a']);
  assert.deepEqual(results.filter((r) => r.status === 'held').map((r) => r.target), ['sirloinbh/b', 'sirloinbh/c']);
  assert.ok(results.some((r) => r.target === 'waves' && r.status === 'failed'));
  assert.equal(w.comments.length, 1);
  assert.match(w.comments[0], /held/);
});

test('a wave that stays pending past the timeout holds the later waves', async () => {
  const w = world({ checks: { 'sirloinbh/a': [[run(null, 'in_progress')]] } });
  let now = 0;
  const realNow = Date.now;
  Date.now = () => now;
  try {
    const results = await apply(base(w, [t('a', 1), t('b', 2)], { sleep: async (ms) => { now += ms; }, wait: { pollMs: 400, timeoutMs: 1000, noChecksGraceMs: 0 } }));
    assert.deepEqual(w.synced, ['sirloinbh/a']);
    assert.match(results.at(-1).error, /timeout/);
  } finally {
    Date.now = realNow;
  }
});

test('a wave-1 sync error holds the later waves', async () => {
  const w = world({ failSync: ['sirloinbh/a'] });
  await apply(base(w, [t('a', 1), t('b', 2)]));
  assert.deepEqual(w.synced, []);
});

test('all_waves syncs everything at once without reading checks', async () => {
  const w = world({ checks: { 'sirloinbh/a': [[run('failure')]] } });
  await apply(base(w, [t('a', 1), t('b', 2), t('c')], { allWaves: true }));
  assert.deepEqual(w.synced, ['sirloinbh/a', 'sirloinbh/b', 'sirloinbh/c']);
  assert.deepEqual(w.polls, {});
});

test('waitForChecks times out when a PR never shows a check and the grace is longer than the deadline', async () => {
  let now = 0;
  const out = await waitForChecks({ api: async () => ({ check_runs: [] }), repo: 'o/r', branch: 'b', sleep: async (ms) => { now += ms; }, now: () => now, deadline: 1000, pollMs: 300, noChecksGraceMs: 5000 });
  assert.equal(out.state, 'timeout');
});
