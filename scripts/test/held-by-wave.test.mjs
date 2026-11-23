import assert from 'node:assert/strict';
import test from 'node:test';
import { heldByWave, renderCompliance, waveCell } from '../lib/compliance.mjs';
import { remoteStatuses } from '../compliance.mjs';

const CENTRAL = 'abcdef1234567';
const status = (repo, wave, { checks, centralSha = '1111111' } = {}) => ({
  repo, profile: 'app', wave, synced: true, centralSha, problems: [], packages: [], env: [], envProblems: [], korean: null,
  syncPr: checks === undefined ? null : { number: 5, url: `https://github.com/${repo}/pull/5`, ageDays: 1, checks },
});

test('a repo of a later wave is held while an earlier wave has a red sync PR (#1075)', () => {
  const all = [status('o/canary', 1, { checks: 'red' }), status('o/app', 2), status('o/infra', null), status('o/other-canary', 1, { checks: 'green' })];
  const held = heldByWave(all, CENTRAL);
  assert.deepEqual([...held], [['o/app', 1], ['o/infra', 1]]);
  assert.equal(waveCell(all[1], held), '2 (held by wave 1)');
  assert.equal(waveCell(all[2], held), 'last (held by wave 1)');
  assert.equal(waveCell(all[0], held), '1', 'the failing wave itself is not held');
});

test('a repo that already reached the current central commit, or has no red earlier wave, is not held', () => {
  const current = [status('o/canary', 1, { checks: 'red' }), status('o/app', 2, { centralSha: CENTRAL.slice(0, 7) })];
  assert.equal(heldByWave(current, CENTRAL).size, 0);
  const pending = [status('o/canary', 1, { checks: 'pending' }), status('o/app', 2), status('o/unknown', 2, { checks: null })];
  assert.equal(heldByWave(pending, CENTRAL).size, 0, 'only a red sync PR holds later waves');
  assert.equal(heldByWave([status('o/canary', 1, { checks: 'red' }), status('o/app', 1)], CENTRAL).size, 0, 'the same wave is not held');
});

test('the report shows each target wave and the held cell, and marks the red sync PR', () => {
  const all = [status('o/canary', 1, { checks: 'red' }), status('o/app', 2), { repo: 'o/gone', profile: 'app', unknown: 'no access' }];
  const report = renderCompliance(all, { generatedAt: 'x', centralSha: CENTRAL });
  assert.match(report, /\| Open sync PR \| Sync wave \|/);
  assert.match(report, /\| o\/canary \|.*\| \[#5\]\(.*\) 1 days old, CI red \| 1 \|/);
  assert.match(report, /\| o\/app \|.*\| none \| 2 \(held by wave 1\) \|/);
  assert.match(report, /\| o\/gone \| unknown \(no access\) \|/);
});

test('the sync PR CI state is read through check runs and stays unknown without the Checks permission', async () => {
  const data = { projects: { projects: [] }, sync: { targets: [{ repo: 'o/a', wave: 1, profile: 'service', project: null }, { repo: 'o/b', wave: 2, profile: 'service', project: null }] } };
  const pull = { number: 7, html_url: 'https://github.com/o/a/pull/7', created_at: '2026-11-22T00:00:00Z', head: { ref: 'chore/standards-sync-abc1234', sha: 'deadbeef' } };
  const getClient = async (repo) => async (method, path) => {
    if (path.endsWith(`/repos/${repo}`)) return { full_name: repo, default_branch: 'main' };
    if (path.includes('/git/ref/')) return { object: { sha: 'c1' } };
    if (path.includes('/git/commits/')) return { tree: { sha: 't1' } };
    if (path.includes('/git/trees/')) return { tree: [] };
    if (path.includes('/pulls?state=open')) return repo === 'o/a' ? [pull] : [];
    if (path.includes('/check-runs')) {
      if (repo === 'o/b') throw new Error('403');
      return { check_runs: [{ name: 'verify', status: 'completed', conclusion: 'failure' }] };
    }
    return null;
  };
  const statuses = await remoteStatuses({ data, getClient, now: new Date('2026-11-23T00:00:00Z') });
  const a = statuses.find((s) => s.repo === 'o/a');
  assert.equal(a.wave, 1);
  assert.equal(a.syncPr.checks, 'red');
  assert.equal(statuses.find((s) => s.repo === 'o/b').syncPr, null);
});
