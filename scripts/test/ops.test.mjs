import assert from 'node:assert/strict';
import test from 'node:test';
import { collectOps, countItems, opsCells, oldestOpenPr, parseHistory, renderTrend, updateHistory } from '../lib/ops.mjs';
import { renderCompliance } from '../lib/compliance.mjs';
import { renderReports } from '../compliance.mjs';

const now = new Date('2026-11-23T12:00:00Z');
const pr = (number, created, extra = {}) => ({ number, created_at: created, html_url: `https://github.com/o/r/pull/${number}`, title: `PR ${number}`, labels: [], ...extra });

test('the oldest open PR skips PRs marked do not merge', () => {
  const old = oldestOpenPr([pr(1, '2026-10-01T00:00:00Z', { title: 'do not merge: experiment' }), pr(2, '2026-11-13T00:00:00Z'), pr(3, '2026-10-05T00:00:00Z', { labels: [{ name: 'do not merge' }] })], now);
  assert.equal(old.number, 2);
  assert.equal(old.ageDays, 10);
  assert.equal(old.held, 2);
  assert.equal(oldestOpenPr([], now).number, null);
});

function fakeApi({ ci, dependabot, scanning, commit, deployments, statuses } = {}) {
  return async (method, path) => {
    if (path.includes('/deployments/') && path.includes('/statuses')) return statuses ?? [];
    if (path.includes('/deployments?')) return deployments ?? [];
    if (path.includes('/actions/runs')) return ci;
    if (path.includes('/dependabot/alerts')) { if (dependabot instanceof Error) throw dependabot; return dependabot; }
    if (path.includes('/code-scanning/alerts')) { if (scanning instanceof Error) throw scanning; return scanning; }
    if (path.includes('/commits/main')) return commit;
    return null;
  };
}

test('every ops value is read on its own and an unreadable one is null', async () => {
  const api = fakeApi({
    ci: { workflow_runs: [{ conclusion: 'failure', updated_at: '2026-11-21T00:00:00Z' }] },
    dependabot: Array.from({ length: 3 }, () => ({})),
    scanning: new Error('GitHub API GET failed: 403 Resource not accessible'),
    commit: { commit: { committer: { date: '2026-11-22T00:00:00Z' } } },
  });
  const ops = await collectOps(api, 'o/r', { pulls: [pr(7, '2026-11-20T00:00:00Z')], now });
  assert.deepEqual(ops.ci, { conclusion: 'failure', at: '2026-11-21T00:00:00Z' });
  assert.deepEqual(ops.dependabot, { count: 3, more: false });
  assert.equal(ops.codeScanning, null);
  assert.equal(ops.lastMerge, '2026-11-22T00:00:00Z');
  const cells = opsCells(ops, now);
  assert.equal(cells.ci, '✗ failure 2d ago');
  assert.equal(cells.alerts, '✗ 3 / ?');
  assert.equal(cells.merge, '1d ago (main merge, no deploy record)');
  assert.match(cells.pr, /\[#7\].* 3d/);
  assert.deepEqual(opsCells(null), { ci: '—', alerts: '—', merge: '—', pr: '—' });
});

test('a green CI run with no alerts reads as clean, no runs reads as no run', async () => {
  const ops = await collectOps(fakeApi({ ci: { workflow_runs: [{ conclusion: 'success', updated_at: '2026-11-23T01:00:00Z' }] }, dependabot: [], scanning: [], commit: null }), 'o/r', { now });
  assert.equal(opsCells(ops, now).ci, '✓ today');
  assert.equal(opsCells(ops, now).alerts, '0 / 0');
  assert.equal(opsCells(ops, now).merge, '?');
  const none = await collectOps(fakeApi({ ci: { workflow_runs: [] } }), 'o/r', { now });
  assert.equal(opsCells(none, now).ci, 'no run');
});

test('the history gets one line per day, replaces a rerun of the same day, and keeps order', () => {
  let text = updateHistory('', '2026-11-22', { fail: 5, warn: 9 });
  text = updateHistory(text, '2026-11-23', { fail: 4, warn: 9 });
  text = updateHistory(text, '2026-11-23', { fail: 3, warn: 9 });
  assert.equal(text, 'date,fail,warn\n2026-11-22,5,9\n2026-11-23,3,9\n');
  assert.deepEqual(parseHistory(text).map((r) => r.fail), [5, 3]);
  const trend = renderTrend(text).join('\n');
  assert.match(trend, /\| 2026-11-23 \| 3 ↓ \| 9 → \|/);
  assert.deepEqual(renderTrend(''), []);
});

test('the trend shows only the last 14 days', () => {
  let text = '';
  for (let d = 1; d <= 20; d++) text = updateHistory(text, `2026-11-${String(d).padStart(2, '0')}`, { fail: d, warn: 0 });
  const rows = renderTrend(text).filter((l) => /^\| 2026-/.test(l));
  assert.equal(rows.length, 14);
  assert.match(rows[0], /2026-11-07/);
});

test('countItems adds failing and recommended items of all repos and skips unknown ones', () => {
  const counts = countItems([
    { repo: 'a', problems: ['x'], packages: [{ ok: false }, { ok: true }], envProblems: [], settings: [{ status: 'fail' }, { status: 'warn' }, { status: 'plan' }], korean: { files: ['a.md'] }, epics: { orphans: [{}] }, ops: { ci: { conclusion: 'failure' }, dependabot: { count: 2 }, codeScanning: { count: 0 } } },
    { repo: 'b', unknown: 'no access' },
  ]);
  assert.deepEqual(counts, { fail: 1 + 1 + 1 + 1 + 1 + 1, warn: 2 });
});

test('the reports carry the new columns, the trend, and the history file when a previous history is given', () => {
  const status = { repo: 'sirloinbh/a', profile: 'app', synced: true, centralSha: null, problems: [], packages: [], syncPr: null, env: [], envProblems: [], korean: null, ops: { ci: { conclusion: 'success', at: '2026-11-23T00:00:00Z' }, dependabot: { count: 0, more: false }, codeScanning: null, lastMerge: '2026-11-20T00:00:00Z', oldestPr: { number: null, ageDays: 0, held: 0 } } };
  const meta = { generatedAt: 'x', centralSha: 'abcdef1234567', now };
  const plain = renderReports([status], meta);
  assert.deepEqual(Object.keys(plain), ['docs/compliance.md', 'docs/env-matrix.md']);
  assert.match(plain['docs/compliance.md'], /\| CI on main \| Alerts \(Dependabot \/ code scanning\) \| Last deploy \| Oldest open PR \|/);
  assert.match(plain['docs/compliance.md'], /\| ✓ today \| 0 \/ \? \| 3d ago \(main merge, no deploy record\) \| none \|/);
  assert.doesNotMatch(plain['docs/compliance.md'], /## Trend/);
  const withHistory = renderReports([status], { ...meta, previousHistory: 'date,fail,warn\n2026-11-22,2,0\n' });
  assert.equal(withHistory['docs/compliance-history.csv'], 'date,fail,warn\n2026-11-22,2,0\n2026-11-23,0,0\n');
  assert.match(withHistory['docs/compliance.md'], /## Trend \(last 14 days\)[\s\S]*\| 2026-11-23 \| 0 ↓ \| 0 → \|/);
  assert.equal(renderCompliance([status], { ...meta }).includes('## Trend'), false);
});

test('a deployment record wins over the main commit time, and a repo without a success status falls back and says so (#1086)', async () => {
  const commit = { commit: { committer: { date: '2026-11-22T00:00:00Z' } } };
  const withRecord = await collectOps(fakeApi({ commit, deployments: [{ id: 1 }, { id: 2 }], statuses: [{ state: 'success', created_at: '2026-11-23T06:00:00Z' }] }), 'o/r', { now });
  assert.equal(withRecord.deployedAt, '2026-11-23T06:00:00Z');
  assert.equal(opsCells(withRecord, now).merge, 'today');
  const onlyFailed = await collectOps(fakeApi({ commit, deployments: [{ id: 1 }], statuses: [{ state: 'failure', created_at: '2026-11-23T06:00:00Z' }] }), 'o/r', { now });
  assert.equal(onlyFailed.deployedAt, null);
  assert.equal(opsCells(onlyFailed, now).merge, '1d ago (main merge, no deploy record)');
  const unreadable = await collectOps(async (m, path) => { if (path.includes('/deployments')) throw new Error('403'); return commit; }, 'o/r', { now });
  assert.equal(opsCells(unreadable, now).merge, '1d ago (main merge, no deploy record)');
});
