// tools/dependency-prs.mjs (#268): open Dependabot PRs grouped across repositories, closed in bulk on request.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { groupPrs, parseTitle, renderTable, run, selectPrs } from '../../tools/dependency-prs.mjs';

// The shape `gh search prs --json repository,number,title,url,createdAt` returned on 2026-10-27.
const SEARCH = [
  { repository: { name: 'workout-memo', nameWithOwner: 'sirloinbh/workout-memo' }, number: 157, title: 'chore(deps): Bump zod from 3.25.76 to 4.6.7', url: 'u', createdAt: '2026-10-26' },
  { repository: { name: 'workout-memo', nameWithOwner: 'sirloinbh/workout-memo' }, number: 153, title: 'chore(deps): Bump zod from 3.25.76 to 4.6.6 in /backend', url: 'u', createdAt: '2026-10-26' },
  { repository: { name: 'study-log', nameWithOwner: 'sirloinbh/study-log' }, number: 106, title: 'chore(deps): Bump zod from 3.25.76 to 4.6.7', url: 'u', createdAt: '2026-10-26' },
  { repository: { name: 'study-log', nameWithOwner: 'sirloinbh/study-log' }, number: 109, title: 'chore(deps): Bump body-parser from 2.3.0 to 2.4.0', url: 'u', createdAt: '2026-10-26' },
  { repository: { name: 'health-log', nameWithOwner: 'sirloinbh/health-log' }, number: 12, title: 'chore(deps): Bump the security-minor-patch group across 3 directories with 2 updates', url: 'u', createdAt: '2026-10-28' },
];

function fakeGh(dir, { login = 'sirloinbh', failClose = false } = {}) {
  const script = path.join(dir, 'fake-gh.mjs');
  fs.writeFileSync(
    script,
    `import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(path.join(dir, 'gh.log'))}, JSON.stringify(args) + '\\n');
if (args[0] === 'api') process.stdout.write(${JSON.stringify(login + '\n')});
else if (args[0] === 'search') process.stdout.write(${JSON.stringify(JSON.stringify(SEARCH))});
else if (args[0] === 'pr' && ${failClose} && args[2] === '153') { process.stderr.write('HTTP 403'); process.exit(1); }
`,
  );
  return script;
}
async function withGh(options, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dependency-prs-'));
  const before = process.env.DEPENDENCY_PRS_GH;
  process.env.DEPENDENCY_PRS_GH = fakeGh(dir, options);
  const lines = [];
  try {
    const calls = () => (fs.existsSync(path.join(dir, 'gh.log')) ? fs.readFileSync(path.join(dir, 'gh.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
    return await fn({ lines, log: (l) => lines.push(l), calls });
  } finally {
    if (before === undefined) delete process.env.DEPENDENCY_PRS_GH;
    else process.env.DEPENDENCY_PRS_GH = before;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('titles give the package, versions, directory and whether it is a major update', () => {
  assert.deepEqual(parseTitle('chore(deps): Bump zod from 3.25.76 to 4.6.6 in /backend'), { package: 'zod', from: '3.25.76', to: '4.6.6', directory: '/backend', kind: 'major' });
  assert.deepEqual(parseTitle('chore(deps): Bump body-parser from 2.3.0 to 2.4.0'), { package: 'body-parser', from: '2.3.0', to: '2.4.0', directory: '/', kind: 'minor/patch' });
  assert.equal(parseTitle('Bump the security-major group across 3 directories with 1 update').kind, 'major');
  assert.equal(parseTitle('Bump the security-minor-patch group in / with 2 updates').package, '(group) security-minor-patch');
});

test('list groups the same update across repositories, most widespread first', () =>
  withGh({}, async ({ lines, log, calls }) => {
    assert.equal(await run(['list'], { log }), 0);
    const table = lines.join('\n');
    assert.match(table, /^\| `zod` \| 3\.25\.76 → 4\.6\.7 \| major \| 2 \| workout-memo#157, study-log#106 \|$/m);
    assert.match(table, /^\| `zod` \| 3\.25\.76 → 4\.6\.6 \| major \| 1 \| workout-memo#153 \(\/backend\) \|$/m);
    assert.match(table, /5 open PRs, 4 kinds of updates/);
    assert.deepEqual(calls()[0], ['api', 'user', '--jq', '.login']);
    assert.ok(calls().every((c) => c[0] !== 'pr'), 'list only reads');
  }));

test('a different GitHub account stops before anything is read', () =>
  withGh({ login: 'company-account' }, async ({ log, calls }) => {
    await assert.rejects(run(['list'], { log }), /the GitHub account is not sirloinbh/);
    assert.equal(calls().length, 1);
  }));

test('close asks first, closes only matching PRs with a comment, and never merges', () =>
  withGh({}, async ({ lines, log, calls }) => {
    assert.equal(await run(['close', '--package', 'zod'], { log, ask: async () => false }), 1);
    assert.ok(lines.includes('Nothing closed.'));
    assert.ok(calls().every((c) => c[0] !== 'pr'));
    lines.length = 0;
    assert.equal(await run(['close', '--package', 'zod', '--to', '4.6.7', '--yes'], { log }), 0);
    const closes = calls().filter((c) => c[0] === 'pr');
    assert.deepEqual(closes.map((c) => [c[1], c[2], c[4]]), [['close', '157', 'sirloinbh/workout-memo'], ['close', '106', 'sirloinbh/study-log']]);
    assert.match(closes[0][6], /project-standards#268/);
    assert.ok(calls().every((c) => !c.includes('merge')));
  }));

test('a failed close is reported and makes the command fail', () =>
  withGh({ failClose: true }, async ({ lines, log }) => {
    assert.equal(await run(['close', '--package', 'zod', '--repo', 'workout-memo', '--yes'], { log }), 1);
    assert.ok(lines.some((l) => /Failed: sirloinbh\/workout-memo#153 — .*HTTP 403/.test(l)));
    assert.ok(lines.includes('  Closed: sirloinbh/workout-memo#157'));
  }));

test('selection and rendering work on plain data', () => {
  const prs = SEARCH.map((p) => ({ repo: p.repository.nameWithOwner, number: p.number, title: p.title, ...parseTitle(p.title) }));
  assert.equal(selectPrs(prs, { package: 'zod', repo: 'study-log' }).length, 1);
  assert.equal(renderTable([]), 'No open Dependabot PRs.');
  assert.equal(groupPrs(prs)[0].prs.length, 2);
});
