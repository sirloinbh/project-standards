// tools/labels.mjs (#277): app repository issues moved to the central standard labels.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildPlan, planIssue, priorityOf, run, targetRepos } from '../../tools/labels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Label shapes seen in the app repositories on 2026-10-27.
const SEARCH = [
  { repository: { nameWithOwner: 'sirloinbh/plan-routine' }, number: 5, title: 'a', labels: [{ name: 'enhancement' }, { name: 'P1 높음' }] },
  { repository: { nameWithOwner: 'sirloinbh/study-log' }, number: 5, title: 'b', labels: [{ name: '우선순위: P0' }, { name: 'enhancement' }] },
  { repository: { nameWithOwner: 'sirloinbh/workout-memo' }, number: 140, title: 'c', labels: [{ name: 'priority:P2' }] },
  { repository: { nameWithOwner: 'sirloinbh/workout-memo' }, number: 101, title: 'd', labels: [] },
  { repository: { nameWithOwner: 'sirloinbh/workout-memo' }, number: 148, title: 'e', labels: [{ name: 'priority/P2' }, { name: 'type/security' }] },
  { repository: { nameWithOwner: 'sirloinbh/BH_Portfolio' }, number: 1, title: 'other project', labels: [] },
  { repository: { nameWithOwner: 'sirloinbh/project-standards' }, number: 240, title: 'central', labels: [] },
  { repository: { nameWithOwner: 'sirloinbh/plan-routine' }, number: 3, title: 'done', state: 'CLOSED', labels: [{ name: 'P2 보통' }] },
  { repository: { nameWithOwner: 'sirloinbh/plan-routine' }, number: 2, title: 'done, no priority', state: 'CLOSED', labels: [] },
];

test('existing priority label names map to the standard ones', () => {
  for (const [from, to] of [
    ['P0 긴급', 'priority/P0'],
    ['P3 매우 후순위', 'priority/P3'],
    ['우선순위: P1', 'priority/P1'],
    ['priority:P2', 'priority/P2'],
    ['priority/P4', 'priority/P4'],
  ])
    assert.equal(priorityOf(from), to, from);
  for (const none of ['API', 'enhancement', '특성: API', 'P5', 'type:tracking']) assert.equal(priorityOf(none), null, none);
});

test('an issue gets one priority and one obvious type; standard labels already there are kept', () => {
  assert.deepEqual(planIssue(['enhancement', 'P1 높음']).map((a) => a.label), ['priority/P1', 'type/feature']);
  assert.deepEqual(planIssue(['priority/P2', 'type/security']), []);
  assert.deepEqual(planIssue([]).map((a) => a.label), ['priority/P3']);
  assert.deepEqual(planIssue([], { defaultP3: false }), []);
  assert.deepEqual(planIssue(['documentation']).map((a) => a.label), ['priority/P3', 'type/docs']);
});

test('only portfolio repositories are planned, and unlabeled issues can be left alone per repository', () => {
  assert.ok(targetRepos(root).has('sirloinbh/file-control'));
  assert.ok(!targetRepos(root).has('sirloinbh/BH_Portfolio'));
  const issues = SEARCH.filter((i) => !i.state)
    .map((i) => ({ repo: i.repository.nameWithOwner, number: i.number, state: 'open', labels: i.labels.map((l) => l.name) }))
    .filter((i) => targetRepos(root).has(i.repo));
  assert.deepEqual(buildPlan(issues).map((p) => `${p.repo}#${p.number}`), ['sirloinbh/plan-routine#5', 'sirloinbh/study-log#5', 'sirloinbh/workout-memo#140', 'sirloinbh/workout-memo#101']);
  assert.deepEqual(buildPlan(issues, { keepUnlabeled: ['workout-memo'] }).map((p) => p.number), [5, 5, 140]);
});

function fakeGh(dir) {
  const script = path.join(dir, 'fake-gh.mjs');
  fs.writeFileSync(
    script,
    `import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(path.join(dir, 'gh.log'))}, JSON.stringify(args) + '\\n');
if (args[0] === 'api') process.stdout.write('sirloinbh\\n');
else if (args[0] === 'search') {
  const state = args.includes('--state') ? args[args.indexOf('--state') + 1] : 'all';
  const all = ${JSON.stringify(SEARCH)};
  process.stdout.write(JSON.stringify(state === 'all' ? all : all.filter((i) => (i.state ?? 'OPEN') === 'OPEN')));
}
`,
  );
  return script;
}
async function withGh(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'labels-'));
  const before = process.env.LABELS_GH;
  process.env.LABELS_GH = fakeGh(dir);
  try {
    const calls = () => fs.readFileSync(path.join(dir, 'gh.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    return await fn({ calls });
  } finally {
    if (before === undefined) delete process.env.LABELS_GH;
    else process.env.LABELS_GH = before;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('plan only reads; apply asks, creates the needed standard labels and only adds labels', () =>
  withGh(async ({ calls }) => {
    const lines = [];
    assert.equal(await run(['plan'], { root, log: (l) => lines.push(l) }), 0);
    assert.match(lines[0], /^\| workout-memo \| 3 \| 2 \| `priority\/P2` 1, `priority\/P3` 1 \| #101 \|$/m);
    assert.match(lines[0], /^\| 우선순위: P0 \| `priority\/P0` \|$/m);
    assert.ok(calls().every((c) => !['issue', 'label'].includes(c[0])), 'plan does not write');

    assert.equal(await run(['apply'], { root, log: () => {}, ask: async () => false }), 1);
    assert.ok(calls().every((c) => !['issue', 'label'].includes(c[0])), 'declining writes nothing');

    assert.equal(await run(['apply', '--yes', '--keep-unlabeled', 'workout-memo'], { root, log: () => {} }), 0);
    const edits = calls().filter((c) => c[0] === 'issue');
    assert.deepEqual(edits.map((c) => [c[2], c[4], ...c.slice(5)]), [
      ['5', 'sirloinbh/plan-routine', '--add-label', 'priority/P1', '--add-label', 'type/feature'],
      ['5', 'sirloinbh/study-log', '--add-label', 'priority/P0', '--add-label', 'type/feature'],
      ['140', 'sirloinbh/workout-memo', '--add-label', 'priority/P2'],
    ]);
    assert.ok(calls().every((c) => !c.includes('--remove-label') && !(c[0] === 'label' && c[1] === 'delete')), 'old labels stay');
    const created = calls().filter((c) => c[0] === 'label' && c[1] === 'create');
    assert.ok(created.some((c) => c[2] === 'priority/P0' && c[4] === 'sirloinbh/study-log' && c.includes('--force')));
  }));

test('overrides set priorities, and --remove-old relabels closed issues before deleting old labels', () =>
  withGh(async ({ calls }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'labels-overrides-'));
    const file = path.join(dir, 'overrides.json');
    fs.writeFileSync(file, JSON.stringify({ 'workout-memo#101': 'priority/P1' }));
    try {
      assert.equal(await run(['apply', '--yes', '--remove-old', '--overrides', file], { root, log: () => {} }), 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    const edits = calls().filter((c) => c[0] === 'issue').map((c) => `${c[4]}#${c[2]} ${c.filter((x, i) => c[i - 1] === '--add-label').join(',')}`);
    assert.ok(edits.includes('sirloinbh/workout-memo#101 priority/P1'), 'override instead of P3');
    assert.ok(edits.includes('sirloinbh/plan-routine#3 priority/P2'), 'closed issue keeps its priority as a standard label');
    assert.ok(!edits.some((e) => e.startsWith('sirloinbh/plan-routine#2 ')), 'a closed issue without a priority gets none');
    const deletes = calls().filter((c) => c[0] === 'label' && c[1] === 'delete').map((c) => `${c[4]} ${c[2]}`).sort();
    assert.deepEqual(deletes, ['sirloinbh/plan-routine P1 높음', 'sirloinbh/plan-routine P2 보통', 'sirloinbh/plan-routine enhancement', 'sirloinbh/study-log enhancement', 'sirloinbh/study-log 우선순위: P0', 'sirloinbh/workout-memo priority:P2']);
    const lastEdit = calls().findLastIndex((c) => c[0] === 'issue');
    const firstDelete = calls().findIndex((c) => c[0] === 'label' && c[1] === 'delete');
    assert.ok(lastEdit < firstDelete, 'labels are added everywhere before any old label is deleted');
  }));
