// tools/project-board.mjs (#279): open portfolio issues on one Projects board, Priority from labels.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildPlan, priorityField, run } from '../../tools/project-board.mjs';

const OPTIONS = ['P0', 'P1', 'P2', 'P3', 'P4'].map((name, i) => ({ id: `opt${i}`, name }));
const FIELDS = [
  { id: 'F-status', name: 'Status', type: 'ProjectV2SingleSelectField', options: [{ id: 's1', name: 'Todo' }] },
  { id: 'F-priority', name: 'Priority', type: 'ProjectV2SingleSelectField', options: OPTIONS },
];
const issue = (repo, number, labels) => ({ repository: { nameWithOwner: `sirloinbh/${repo}` }, number, title: `${repo} ${number}`, url: `https://github.com/sirloinbh/${repo}/issues/${number}`, labels: labels.map((name) => ({ name })) });
const SEARCH = [
  issue('workout-memo', 105, ['priority/P2']), // on the board, Priority already P2
  issue('workout-memo', 106, ['priority/P4', 'needs-user']), // on the board, Priority missing
  issue('study-log', 7, ['priority/P1']), // not on the board
  issue('health-log', 3, []), // not on the board, no priority label
  issue('BH_Portfolio', 1, ['priority/P1']), // not a portfolio app: ignored
];
const ITEMS = [
  { id: 'I-105', content: { repository: 'sirloinbh/workout-memo', number: 105, type: 'Issue' }, priority: 'P2' },
  { id: 'I-106', content: { repository: 'sirloinbh/workout-memo', number: 106, type: 'Issue' } },
  { id: 'I-draft', content: { title: 'a draft note', type: 'DraftIssue' } },
];

test('the Priority field needs a single-select option for each of P0..P4', () => {
  assert.equal(priorityField(FIELDS).options['priority/P3'].id, 'opt3');
  assert.match(priorityField([FIELDS[0]]).problem, /no "Priority" field/);
  assert.match(priorityField([{ id: 'x', name: 'priority', type: 'ProjectV2Field' }]).problem, /not a single select/);
  assert.match(priorityField([{ ...FIELDS[1], options: OPTIONS.slice(0, 3) }]).problem, /no option for P3, P4/);
  assert.equal(priorityField([{ ...FIELDS[1], options: [{ id: 'a', name: '🔥 P0 urgent' }, ...OPTIONS.slice(1)] }]).options['priority/P0'].id, 'a');
});

test('the plan adds missing issues and fixes Priority only where it differs', () => {
  const issues = SEARCH.slice(0, 4).map((i) => ({ repo: i.repository.nameWithOwner, number: i.number, url: i.url, labels: i.labels.map((l) => l.name) }));
  const { add, set } = buildPlan(issues, ITEMS, priorityField(FIELDS).options);
  assert.deepEqual(add.map((i) => [i.repo, i.number, i.option?.name ?? null]), [['sirloinbh/study-log', 7, 'P1'], ['sirloinbh/health-log', 3, null]]);
  assert.deepEqual(set.map((i) => [i.itemId, i.option.name]), [['I-106', 'P4']]);
});

function fakeGh(dir, { fields = FIELDS } = {}) {
  const script = path.join(dir, 'fake-gh.mjs');
  fs.writeFileSync(
    script,
    `import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(path.join(dir, 'gh.log'))}, JSON.stringify(args) + '\\n');
const out = (v) => process.stdout.write(typeof v === 'string' ? v : JSON.stringify(v));
const [a, b] = args;
if (a === 'api') out('sirloinbh\\n');
else if (a === 'project' && b === 'view') out({ id: 'PVT_1', title: 'sirloinbh apps', number: 5 });
else if (a === 'project' && b === 'field-list') out({ fields: ${JSON.stringify(fields)} });
else if (a === 'project' && b === 'item-list') out({ items: ${JSON.stringify(ITEMS)} });
else if (a === 'search') out(${JSON.stringify(SEARCH)});
else if (a === 'project' && b === 'item-add') out({ id: 'NEW-' + args[args.indexOf('--url') + 1].split('/').pop() });
else if (a === 'project' && b === 'item-edit') out('');
else { process.stderr.write('unexpected ' + args.join(' ')); process.exit(1); }
`,
  );
  return script;
}

async function withGh(options, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-board-test-'));
  const before = process.env.BOARD_GH;
  process.env.BOARD_GH = fakeGh(dir, options);
  const lines = [];
  try {
    await fn({ lines, log: (l) => lines.push(l), calls: () => fs.readFileSync(path.join(dir, 'gh.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) });
  } finally {
    if (before === undefined) delete process.env.BOARD_GH;
    else process.env.BOARD_GH = before;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('plan is read-only and reports per repository', () =>
  withGh({}, async ({ lines, log, calls }) => {
    assert.equal(await run(['plan'], { log }), 0);
    const out = lines.join('\n');
    assert.match(out, /sirloinbh apps \(#5\): 3 items on the board/);
    assert.match(out, /\| workout-memo \| 2 \| 0 \| 1 \|/);
    assert.match(out, /\| study-log \| 1 \| 1 \| 1 \|/);
    assert.match(out, /Added without Priority \(no priority\/P0\.\.P4 label\): health-log#3/);
    assert.ok(!out.includes('BH_Portfolio'));
    assert.ok(!calls().some((c) => c[1] === 'item-add' || c[1] === 'item-edit'), 'no writes');
  }));

test('sync adds the missing issues and sets Priority with the board, field, and option ids', () =>
  withGh({}, async ({ lines, log, calls }) => {
    assert.equal(await run(['sync', '--yes'], { log }), 0);
    const writes = calls().filter((c) => c[1] === 'item-add' || c[1] === 'item-edit');
    assert.deepEqual(writes, [
      ['project', 'item-add', '5', '--owner', 'sirloinbh', '--url', 'https://github.com/sirloinbh/study-log/issues/7', '--format', 'json'],
      ['project', 'item-edit', '--id', 'NEW-7', '--project-id', 'PVT_1', '--field-id', 'F-priority', '--single-select-option-id', 'opt1'],
      ['project', 'item-add', '5', '--owner', 'sirloinbh', '--url', 'https://github.com/sirloinbh/health-log/issues/3', '--format', 'json'],
      ['project', 'item-edit', '--id', 'I-106', '--project-id', 'PVT_1', '--field-id', 'F-priority', '--single-select-option-id', 'opt4'],
    ]);
    assert.equal(lines.at(-1), 'Added 2, Priority set on 2, failed 0');
  }));

test('sync asks first, and stops with guidance when the board has no Priority field', async () => {
  await withGh({}, async ({ lines, log, calls }) => {
    assert.equal(await run(['sync', '--project', '5'], { log, ask: async () => false }), 1);
    assert.equal(lines.at(-1), 'No changes made.');
    assert.ok(!calls().some((c) => c[1] === 'item-add'));
  });
  await withGh({ fields: [FIELDS[0]] }, async ({ lines, log, calls }) => {
    assert.equal(await run(['sync', '--yes'], { log }), 1);
    assert.match(lines[0], /no "Priority" field\. On the board, open the field menu/);
    assert.ok(!calls().some((c) => c[1] === 'item-list' || c[1] === 'item-add'), 'stops before reading items');
  });
  await assert.rejects(run(['sync', '--project', 'abc']), /board number/);
});
