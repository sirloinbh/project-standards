import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { autoMergeSyncPr, pendingConfirmations } from '../lib/sync-merge.mjs';
import { apply } from '../sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const BOT = 'chore: sync central standards (project-standards@a1b2c3d)';
const NONE = '## Check before merging\n- None\n\n## Impact\n- x\n';

// A fake repo API for one sync PR.
function fakeApi({ body = NONE, commits = [BOT], checks = 'success', state = 'open', mergeError = null, forbidden = false } = {}) {
  const calls = [];
  const api = async (method, p, payload) => {
    calls.push([method, p, payload]);
    if (/\/check-runs/.test(p)) {
      if (forbidden) throw new Error(`GitHub API GET ${p} failed: 403 Resource not accessible by integration`);
      return { check_runs: [{ name: 'ci', status: 'completed', conclusion: checks }] };
    }
    if (method === 'GET' && /\/pulls\/7$/.test(p)) return { number: 7, state, body, head: { sha: 'headsha' } };
    if (/\/pulls\/7\/commits/.test(p)) return commits.map((message) => ({ commit: { message } }));
    if (method === 'PUT' && /\/pulls\/7\/merge$/.test(p)) {
      if (mergeError) throw new Error(mergeError);
      return { merged: true };
    }
    return null;
  };
  return { api, calls, merges: () => calls.filter((c) => c[0] === 'PUT') };
}
const run = (fake, over = {}) => {
  const logs = [];
  return autoMergeSyncPr({ api: fake.api, repo: 'sirloinbh/file-control', result: { pr: 'https://x/pr/7', number: 7, branch: 'chore/standards-sync-a1b2c3d' }, sleep: async () => {}, deadline: Date.now() + 1000, pollMs: 10, noChecksGraceMs: 0, log: (l) => logs.push(l), ...over }).then((r) => ({ ...r, logs }));
};

test('pendingConfirmations lists the items for the user and ignores "None"', () => {
  assert.deepEqual(pendingConfirmations(NONE), []);
  assert.deepEqual(pendingConfirmations('no section'), []);
  assert.deepEqual(pendingConfirmations('## Check before merging\n- [ ] one\n- [x] two\n\n## Impact\n- [ ] not this'), ['one', 'two']);
});

test('a green sync PR with no items is merged with a merge commit pinned to its head', async () => {
  const fake = fakeApi();
  const r = await run(fake);
  assert.equal(r.merged, true);
  assert.deepEqual(fake.merges()[0].slice(1), ['/repos/sirloinbh/file-control/pulls/7/merge', { merge_method: 'merge', sha: 'headsha' }]);
});

test('a branch with a direct commit is skipped with a warning', async () => {
  const fake = fakeApi({ commits: [BOT, 'fix: update lockfile'] });
  const r = await run(fake);
  assert.equal(r.merged, false);
  assert.equal(fake.merges().length, 0);
  assert.match(r.logs[0], /^::warning::.*1 commit\(s\) were added by hand/);
});

test('an item under "Check before merging" blocks the merge', async () => {
  const fake = fakeApi({ body: '## Check before merging\n- [ ] I checked the package.json change\n' });
  const r = await run(fake);
  assert.equal(r.merged, false);
  assert.equal(fake.merges().length, 0);
  assert.match(r.logs[0], /Check before merging/);
});

test('red CI, a missing Checks permission and a refused merge leave the PR open', async () => {
  for (const [over, pattern] of [[{ checks: 'failure' }, /CI red/], [{ forbidden: true }, /Checks: Read/], [{ mergeError: 'failed: 405 not mergeable' }, /refused the merge/], [{ state: 'closed' }, /not open/]]) {
    const fake = fakeApi(over);
    const r = await run(fake);
    assert.equal(r.merged, false, JSON.stringify(over));
    assert.match(r.logs.join('\n'), pattern);
    assert.equal(fake.merges().length, over.mergeError ? 1 : 0);
  }
});

test('the config opts in exactly shared-auth, shared-aws-infrastructure, file-control and develop-skill', () => {
  assert.deepEqual(data.sync.targets.filter((t) => t.autoMergeSync).map((t) => t.repo).sort(), ['sirloinbh/develop-skill', 'sirloinbh/file-control', 'sirloinbh/shared-auth', 'sirloinbh/shared-aws-infrastructure']);
});

test('apply auto-merges only opted-in targets that opened or updated a PR', async () => {
  const merged = [];
  const targets = [
    { repo: 'sirloinbh/file-control', profile: 'utility', project: null, autoMergeSync: true },
    { repo: 'sirloinbh/shared-ai', profile: 'utility', project: null },
    { repo: 'sirloinbh/develop-skill', profile: 'utility', project: null, autoMergeSync: true },
  ];
  const results = await apply({
    data, targets, centralSha: SHA, getToken: async (r) => r, makeClient: () => async () => null, labels: [], log: () => {}, sleep: async () => {}, centralPr: () => null,
    syncTargetFn: async ({ target }) => (target.repo.endsWith('develop-skill') ? { status: 'unchanged', changes: [], deletions: [] } : { status: 'opened', pr: 'https://x', number: 1, branch: 'b', changes: [], deletions: [] }),
    autoMergeFn: async ({ repo }) => (merged.push(repo), { merged: true, reason: 'ok' }),
  });
  assert.deepEqual(merged, ['sirloinbh/file-control']);
  assert.equal(results.find((r) => r.target === 'sirloinbh/file-control').merged, true);
  assert.equal(results.find((r) => r.target === 'sirloinbh/shared-ai').merged, undefined);
});
