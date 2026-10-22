import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { LABELS_PATH, loadLabels, planLabels, syncLabels } from '../lib/labels.mjs';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';
import { apply } from '../sync.mjs';
import { fakeRepo } from './fake-github.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const labels = loadLabels(root);
const REPO = 'sirloinbh/workout-memo';
const SHA1 = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const writes = (repo) => repo.calls.filter((c) => !c.startsWith('GET '));

test('labels.json has every label the std-backlog skill names', () => {
  const skill = fs.readFileSync(path.join(root, 'templates/common/skills/std-backlog/SKILL.md'), 'utf8');
  const names = new Set(labels.map((l) => l.name));
  const expected = [
    ...['P0', 'P1', 'P2', 'P3', 'P4'].map((p) => `priority/${p}`),
    ...['feature', 'docs', 'security', 'chore', 'research'].map((t) => `type/${t}`),
    ...['templates', 'tooling', 'compliance', 'registry', 'scaffold', 'ci', 'deploy', 'agent'].map((a) => `area/${a}`),
    'needs-user',
    'origin/added',
  ];
  for (const name of expected) {
    assert.ok(names.has(name), name);
    assert.ok(skill.includes(`\`${name.split('/').at(-1)}\``) || skill.includes(`\`${name}\``), `${name} is in the skill`);
  }
  assert.equal(labels.length, expected.length, 'no label outside the skill');
});

test('labels.json is sync data, not a file copied into target repositories', () => {
  for (const target of data.sync.targets) {
    const plan = planTarget({ root, data, target, centralSha: SHA1 });
    assert.ok(!plan.files.some((f) => f.path === 'labels.json' || f.source === LABELS_PATH), target.repo);
  }
});

test('loadLabels rejects bad colors, long descriptions, and duplicate names', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'labels-'));
  const write = (list) => {
    fs.mkdirSync(path.join(tmp, 'templates/common'), { recursive: true });
    fs.writeFileSync(path.join(tmp, LABELS_PATH), JSON.stringify({ labels: list }));
  };
  try {
    write([{ name: 'a', color: '#ffffff', description: '' }]);
    assert.throws(() => loadLabels(tmp), /color must be 6 lowercase hex digits/);
    write([{ name: 'a', color: 'ffffff', description: 'x'.repeat(101) }]);
    assert.throws(() => loadLabels(tmp), /at most 100 characters/);
    write([{ name: 'a', color: 'ffffff', description: '' }, { name: 'A', color: 'ffffff', description: '' }]);
    assert.throws(() => loadLabels(tmp), /duplicate name/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('planLabels finds labels to create and update, and leaves unknown labels alone', () => {
  const desired = [
    { name: 'priority/P1', color: 'd93f0b', description: '높음' },
    { name: 'type/docs', color: '0075ca', description: '문서' },
    { name: 'needs-user', color: '5319e7', description: '사용자 단계' },
    { name: 'area/ci', color: 'bfdadc', description: 'CI' },
  ];
  const existing = [
    { name: 'Priority/P1', color: 'd93f0b', description: '높음' },
    { name: 'type/docs', color: '0075CA', description: '문서' },
    { name: 'needs-user', color: '000000', description: null },
    { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
  ];
  const plan = planLabels(desired, existing);
  assert.deepEqual(plan.create.map((l) => l.name), ['area/ci']);
  assert.deepEqual(plan.update.map((u) => [u.name, u.changes]), [
    ['Priority/P1', ['name']],
    ['needs-user', ['color', 'description']],
  ]);
  assert.deepEqual(plan.unchanged, ['type/docs'], 'color case does not count as a change');
  assert.deepEqual(plan.unmanaged, ['bug']);
});

test('syncLabels dry run only reads; a real run creates and updates, then has nothing to do', async () => {
  const repo = fakeRepo(REPO, {}, {
    labels: [
      { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
      { name: 'Priority/P0', color: 'ffffff', description: 'old' },
      { name: 'my-project-label', color: '123456', description: '이 리포만 쓰는 라벨' },
    ],
  });
  const preview = await syncLabels({ api: repo.api, repo: REPO, labels, dryRun: true });
  assert.equal(preview.create.length, labels.length - 1);
  assert.deepEqual(preview.update.map((u) => [u.name, u.changes]), [['Priority/P0', ['name', 'color', 'description']]]);
  assert.deepEqual(preview.unmanaged, ['bug', 'my-project-label']);
  assert.deepEqual(writes(repo), [], 'dry run writes nothing');

  await syncLabels({ api: repo.api, repo: REPO, labels });
  assert.ok(repo.calls.includes(`PATCH /repos/${REPO}/labels/Priority%2FP0`));
  assert.ok(!repo.calls.some((c) => c.startsWith('DELETE ')), 'labels are never deleted');
  for (const label of labels) assert.deepEqual(repo.labels.find((l) => l.name === label.name), label, label.name);
  assert.ok(repo.labels.some((l) => l.name === 'bug') && repo.labels.some((l) => l.name === 'my-project-label'), 'unknown labels stay');

  const before = writes(repo).length;
  const again = await syncLabels({ api: repo.api, repo: REPO, labels });
  assert.equal(again.unchanged.length, labels.length);
  assert.equal(writes(repo).length, before, 'a second run writes nothing');
});

test('syncLabels reads every page of a repository with many labels', async () => {
  const many = Array.from({ length: 150 }, (_, i) => ({ name: `extra-${i}`, color: 'ededed', description: '' }));
  const repo = fakeRepo(REPO, {}, { labels: [...many, ...labels] });
  const plan = await syncLabels({ api: repo.api, repo: REPO, labels });
  assert.equal(plan.create.length, 0, 'labels on page 2 are found');
  assert.equal(plan.unchanged.length, labels.length);
  assert.equal(plan.unmanaged.length, 150);
  assert.deepEqual(writes(repo), []);
});

test('apply syncs labels of targets in rollout and reports label failures separately', async () => {
  const rolled = structuredClone(data);
  rolled.sync.maxRollout = 1;
  const repo = fakeRepo(REPO, { 'package.json': '{"name":"workout-memo"}' });
  const logs = [];
  const results = await apply({ data: rolled, targets: rolled.sync.targets, centralSha: SHA1, getToken: async (r) => r, makeClient: (r) => (r === REPO ? repo.api : async () => null), log: (l) => logs.push(l) });
  assert.equal(results[0].status, 'opened');
  assert.equal(results[0].labels.create.length, labels.length);
  assert.equal(repo.labels.length, labels.length);
  assert.ok(logs.some((l) => l === `${REPO}: 라벨 생성 ${labels.length}, 갱신 0, 그대로 0`), logs.join('\n'));

  // Without the Issues write permission GitHub answers 403; the sync PR result is kept.
  const denied = fakeRepo(REPO, { 'package.json': '{"name":"workout-memo"}' });
  const api = async (method, p, body) => {
    if (method === 'POST' && p.endsWith('/labels')) throw new Error(`GitHub API POST ${p} failed: 403 Resource not accessible by integration`);
    return denied.api(method, p, body);
  };
  const failed = await apply({ data: rolled, targets: rolled.sync.targets, centralSha: SHA1, getToken: async (r) => r, makeClient: (r) => (r === REPO ? api : async () => null), log: () => {} });
  assert.equal(failed[0].status, 'opened');
  assert.match(failed[0].labelsError, /403/);
});

test('the dry-run CLI adds the label plan of targets whose labels were exported', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-labels-'));
  try {
    const exported = path.join(out, 'study-log-labels.json');
    fs.writeFileSync(exported, `﻿${JSON.stringify([{ name: 'bug', color: 'd73a4a', description: '' }, { ...labels[0], color: '000000' }])}`);
    const run = spawnSync(process.execPath, [path.join(root, 'scripts/sync.mjs'), '--dry-run', '--out', out, '--sha', 'cli0001', '--target', 'sirloinbh/study-log', '--labels-from', `study-log=${exported}`], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, new RegExp(`라벨 생성 ${labels.length - 1}, 갱신 1, 그대로 0, 관리 밖 1\\(지우지 않음\\)`));
    const plan = JSON.parse(fs.readFileSync(path.join(out, 'plan.json'), 'utf8'));
    assert.equal(plan.labels.length, labels.length);
    assert.deepEqual(plan.targets[0].labels.update, [{ name: labels[0].name, changes: ['color'] }]);
    assert.deepEqual(plan.targets[0].labels.unmanaged, ['bug']);
    assert.ok(!fs.existsSync(path.join(out, 'study-log', 'labels.json')));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
