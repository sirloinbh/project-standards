import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyIssues, closeFinishedEpics, collectEpicState, fetchOpenIssues } from '../lib/epics.mjs';
import { closeFinished } from '../compliance.mjs';
import { epicsCell, renderCompliance } from '../lib/compliance.mjs';

const epic = (number, summary, extra = {}) => ({ number, title: `Epic ${number}`, labels: [{ name: 'epic' }], sub_issues_summary: summary, body: '', ...extra });
const work = (number, extra = {}) => ({ number, title: `Work ${number}`, labels: [], ...extra });

test('a parentless work issue is reported and a finished epic is found', () => {
  const state = classifyIssues([
    epic(1, { total: 3, completed: 3 }),
    epic(2, { total: 3, completed: 2 }),
    epic(3, { total: 0, completed: 0 }),
    epic(4, { total: 2, completed: 2 }, { body: 'Umbrella. Keep open for new work.' }),
    work(10, { parent_issue_url: 'https://api.github.com/repos/o/r/issues/2' }),
    work(11),
    work(12, { pull_request: {} }),
    work(13, { user: { type: 'Bot' } }),
  ]);
  assert.deepEqual(state.orphans, [{ number: 11, title: 'Work 11' }]);
  assert.deepEqual(state.finished, [{ number: 1, title: 'Epic 1', total: 3 }]);
});

test('issues are read page by page and pull requests are skipped', async () => {
  const pages = [Array.from({ length: 100 }, (_, i) => work(i + 1)), [work(101), work(102, { pull_request: {} })]];
  const calls = [];
  const api = async (method, path) => (calls.push(path), pages[Number(/&page=(\d+)/.exec(path)[1]) - 1]);
  const issues = await fetchOpenIssues(api, 'o/r');
  assert.equal(issues.length, 101);
  assert.equal(calls.length, 2);
  await assert.rejects(fetchOpenIssues(async () => null, 'o/r'), /cannot list issues/);
});

function fakeIssues(subs) {
  const log = [];
  const api = async (method, path, body) => {
    log.push([method, path, body]);
    if (method === 'GET' && /sub_issues/.test(path)) return subs;
    return null;
  };
  return { api, log };
}

test('a finished epic is closed with a comment naming its sub-issues', async () => {
  const { api, log } = fakeIssues([{ number: 5, state: 'closed' }, { number: 6, state: 'closed' }]);
  assert.deepEqual(await closeFinishedEpics(api, 'o/r', [{ number: 1 }]), [1]);
  const comment = log.find(([m, p]) => m === 'POST' && p === '/repos/o/r/issues/1/comments');
  assert.match(comment[2].body, /#5, #6/);
  assert.deepEqual(log.find(([m]) => m === 'PATCH'), ['PATCH', '/repos/o/r/issues/1', { state: 'closed', state_reason: 'completed' }]);
});

test('an epic with a reopened or missing sub-issue is not closed', async () => {
  for (const subs of [[{ number: 5, state: 'closed' }, { number: 6, state: 'open' }], []]) {
    const { api, log } = fakeIssues(subs);
    assert.deepEqual(await closeFinishedEpics(api, 'o/r', [{ number: 1 }]), []);
    assert.ok(!log.some(([m]) => m !== 'GET'));
  }
});

test('the compliance run reports orphans per repo, closes epics, and blanks the column when issues are unreadable', async () => {
  const issues = [epic(1, { total: 1, completed: 1 }), work(11)];
  const target = { repo: 'sirloinbh/a', profile: 'app' };
  const log = [];
  const api = async (method, path, body) => {
    log.push(`${method} ${path}`);
    if (/\/issues\?state=open/.test(path)) return issues;
    if (/sub_issues/.test(path)) return [{ number: 20, state: 'closed' }];
    return null;
  };
  const state = await collectEpicState(api, target.repo);
  const status = { ...target, synced: true, centralSha: null, problems: [], packages: [], syncPr: null, env: [], envProblems: [], korean: null, epics: state };
  await closeFinished({ statuses: [status], getClient: async () => api });
  assert.deepEqual(status.epics.closed, [1]);
  const report = renderCompliance([status, { ...status, repo: 'sirloinbh/b', epics: undefined, epicsError: 'GitHub API GET failed: 403' }], { generatedAt: 'x', centralSha: 'abcdef1234567' });
  assert.match(report, /\| Work issues without epic \|/);
  assert.match(report, /\| sirloinbh\/a \|.*\| ✗ 1 \|/);
  assert.match(report, /\| sirloinbh\/b \|.*\| unknown \|/);
  assert.match(report, /No epic: \[#11\]/);
  assert.match(report, /Closed epic \[#1\]/);
  assert.equal(epicsCell({ epics: { orphans: [], finished: [] } }), '✓');
  assert.equal(epicsCell({}), '—');
});
