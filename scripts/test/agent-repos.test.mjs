// #165: the shared worker (tools/agents) holds no project values. Each fixture is a
// disposable target repository with its own origin, registry and .agents.json; git,
// gh, npm and Codex are fakes, so no real repository, account, model or DB is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  allowedRepository,
  loadRepoConfig,
  parseOrigin,
  registryRepositories,
  validateRepoConfig,
} from '../../tools/agents/config.mjs';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const toolSource = path.join(repositoryRoot, 'tools/agents');

function temporaryDirectory(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

const registry = {
  projects: [
    { name: 'alpha', repos: { umbrella: 'alpha-app', backend: 'alpha-app-backend' } },
    { name: 'beta', repos: { umbrella: 'beta-app' } },
  ],
};

test('origin parsing accepts GitHub HTTPS and SSH forms only', () => {
  for (const remote of [
    'https://github.com/sirloinbh/alpha-app.git',
    'https://github.com/sirloinbh/alpha-app',
    'git@github.com:sirloinbh/alpha-app.git',
  ])
    assert.deepEqual(parseOrigin(remote), { owner: 'sirloinbh', name: 'alpha-app' });
  for (const remote of ['https://gitlab.com/sirloinbh/alpha-app.git', 'C:/repos/alpha-app', ''])
    assert.throws(() => parseOrigin(remote), /GitHub repository/);
});

test('only sirloinbh repositories listed in the registry are allowed', (t) => {
  const file = path.join(temporaryDirectory(t, 'agent-registry-'), 'projects.json');
  fs.writeFileSync(file, JSON.stringify(registry));
  const names = registryRepositories(file);
  assert.deepEqual([...names].sort(), ['alpha-app', 'alpha-app-backend', 'beta-app']);
  assert.equal(
    allowedRepository('git@github.com:sirloinbh/alpha-app-backend.git', names),
    'sirloinbh/alpha-app-backend',
  );
  for (const remote of [
    'https://github.com/sirloinbh/unlisted-app.git',
    'https://github.com/someone-else/alpha-app.git',
  ])
    assert.throws(() => allowedRepository(remote, names), /not a registered project repository/);
  // The real registry is what an installed worker reads.
  assert.ok(registryRepositories(path.join(repositoryRoot, 'registry/projects.json')).size > 0);
});

test('repository config defaults keep checks on npm run check and auto-merge off', (t) => {
  const root = temporaryDirectory(t, 'agent-config-');
  assert.deepEqual(loadRepoConfig(root), {
    checkScript: 'check',
    databaseTables: null,
    browserCheckArgs: null,
    autoMerge: false,
  });
  fs.writeFileSync(
    path.join(root, '.agents.json'),
    '\uFEFF' +
      JSON.stringify({
        checkScript: 'verify:all',
        database: { tables: { items: ['id', 'name'] } },
        browser: { checkArgs: ['test:e2e'] },
        autoMerge: true,
      }),
  );
  assert.deepEqual(loadRepoConfig(root), {
    checkScript: 'verify:all',
    databaseTables: { items: ['id', 'name'] },
    browserCheckArgs: ['test:e2e'],
    autoMerge: true,
  });
});

for (const [name, value] of [
  ['unknown key', { automerge: true }],
  ['string autoMerge', { autoMerge: 'true' }],
  ['shell check command', { checkScript: 'check && rm -rf .' }],
  ['empty tables', { database: { tables: {} } }],
  ['unsafe table name', { database: { tables: { 'items;drop': ['id'] } } }],
  ['unsafe column name', { database: { tables: { items: ['id name'] } } }],
  ['empty browser args', { browser: { checkArgs: [] } }],
  ['array config', []],
]) {
  test(`repository config rejects ${name}`, () => {
    assert.throws(() => validateRepoConfig(value), /\.agents\.json/);
  });
}

test('worker source contains no project-specific repository, table or branch values', () => {
  const values = [
    'workout-memo',
    'brands',
    'machines',
    'workouts',
    'goals',
    '-agent-task`',
    'scripts/gh-project.ps1',
  ];
  for (const file of fs.readdirSync(toolSource)) {
    const text = fs.readFileSync(path.join(toolSource, file), 'utf8');
    for (const value of values)
      assert.ok(!text.includes(value), `${file} contains project value ${value}`);
  }
});

// A fake target repository driven from enqueue through host verification.
function repositoryFixture(t, { name, config, issueNumber = 7 }) {
  const root = temporaryDirectory(t, `agent-${name}-`);
  const tools = path.join(root, 'tools/agents');
  fs.cpSync(toolSource, tools, { recursive: true });
  fs.copyFileSync(path.join(tools, 'process.mjs'), path.join(tools, 'real-process.mjs'));
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, 'registry'));
  fs.writeFileSync(path.join(root, 'registry/projects.json'), JSON.stringify(registry));
  if (config) fs.writeFileSync(path.join(root, '.agents.json'), JSON.stringify(config));
  const home = path.join(root, '.local/agent-workflow');
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(home, 'config.json'),
    JSON.stringify({ codexExecutable: 'fixture-codex', npmCli: path.join(root, 'fake-npm.cjs') }),
  );
  const issue = {
    number: issueNumber,
    title: 'Add CSV export',
    body: '## 완료 기준\n- CSV로 내보낸다.',
    updatedAt: '2026-10-22T00:00:00Z',
    url: `https://github.com/sirloinbh/${name}/issues/${issueNumber}`,
    state: 'OPEN',
  };
  fs.writeFileSync(path.join(root, 'issue.json'), JSON.stringify(issue));
  const branch = `feat/${issueNumber}-add-csv-export`;
  fs.writeFileSync(
    path.join(root, 'fake-npm.cjs'),
    `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(path.join(root, 'npm.jsonl'))}, JSON.stringify(args) + '\\n');
// Stop the worker after host verification so the test never reaches publication.
if (args[0] === 'run') fs.writeFileSync(${JSON.stringify(path.join(home, 'stop'))}, 'stop');
console.log('synthetic npm ' + args.join(' '));
`,
  );
  fs.writeFileSync(
    path.join(root, 'fake-codex.mjs'),
    `import fs from 'node:fs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(path.join(root, 'codex.jsonl'))}, JSON.stringify({ args, input }) + '\\n');
fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
  blocked: false, approved: true, summary: 'Synthetic role complete' }));
console.log(JSON.stringify({ type: 'thread.started', thread_id: 'fixture-thread' }));
`,
  );
  fs.writeFileSync(
    path.join(tools, 'process.mjs'),
    `import fs from 'node:fs';
import path from 'node:path';
import { command as launch } from './real-process.mjs';
const root = ${JSON.stringify(root)};
export async function command(bin, args, options = {}) {
  if (args.includes('--version')) return 'synthetic version';
  if (bin === 'fixture-codex')
    return launch(process.execPath, [path.join(root, 'fake-codex.mjs'), ...args], options);
  if (args[0]?.endsWith('fake-npm.cjs')) return launch(bin, args, options);
  const joined = args.join(' ');
  fs.appendFileSync(path.join(root, 'commands.jsonl'), JSON.stringify({ bin, args }) + '\\n');
  if (/git(?:\\.exe)?$/.test(bin)) {
    if (joined.includes('remote get-url')) return ${JSON.stringify(`git@github.com:sirloinbh/${name}.git`)};
    if (joined.includes('worktree add')) {
      const target = args[args.indexOf('add') + 3];
      fs.mkdirSync(path.join(target, 'node_modules'), { recursive: true });
      fs.writeFileSync(path.join(target, 'package.json'), '{}');
      fs.writeFileSync(path.join(target, 'package-lock.json'), '{"lockfileVersion":3}');
      fs.writeFileSync(path.join(target, 'source.txt'), 'source');
      return '';
    }
    if (joined.includes('branch --show-current')) return ${JSON.stringify(branch)};
    if (joined.includes('rev-parse')) return 'a'.repeat(40);
    if (joined.includes('ls-files') && joined.includes('--cached')) return 'source.txt';
    return '';
  }
  if (joined.includes('api user')) return 'sirloinbh';
  if (joined.includes('issue view')) return fs.readFileSync(path.join(root, 'issue.json'), 'utf8');
  throw new Error('Unexpected fixture command: ' + joined);
}
`,
  );
  const invoke = (args) => {
    const result = spawnSync(
      process.execPath,
      [path.join(tools, 'cli.mjs'), '--root', root, ...args],
      { cwd: os.tmpdir(), encoding: 'utf8', timeout: 30000, windowsHide: true },
    );
    assert.ifError(result.error);
    return result;
  };
  const lines = (file) =>
    fs.existsSync(path.join(root, file))
      ? fs.readFileSync(path.join(root, file), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
      : [];
  const job = () => JSON.parse(fs.readFileSync(path.join(home, `jobs/${issueNumber}/job.json`), 'utf8'));
  return { root, home, branch, invoke, lines, job };
}

for (const [name, config, checkScript] of [
  ['alpha-app', { checkScript: 'verify:all', autoMerge: true }, 'verify:all'],
  ['beta-app', undefined, 'check'],
]) {
  test(`${name} runs from enqueue to host verification with its own repository values`, (t) => {
    const f = repositoryFixture(t, { name, config });
    const queued = f.invoke(['enqueue', '7']);
    assert.equal(queued.status, 0, queued.stderr);
    assert.equal(f.job().branch, 'feat/7-add-csv-export');
    assert.equal(f.job().changeRecord, 'docs/changes/7-add-csv-export.md');
    assert.equal(f.job().issue.url, `https://github.com/sirloinbh/${name}/issues/7`);

    const worked = f.invoke(['work', '--once']);
    assert.equal(worked.status, 0, worked.stderr);
    const job = f.job();
    assert.equal(job.stage, 'delivery', job.error);
    assert.deepEqual(
      job.history.map((entry) => entry.stage),
      ['queued', 'tests', 'implementation', 'review', 'verification'],
    );
    assert.equal(job.results.verification.passed, true);
    assert.match(job.results.verification.summary, new RegExp(`npm run ${checkScript}`));
    assert.deepEqual(
      f.lines('npm.jsonl').map((args) => args.join(' ')),
      ['ci', `run ${checkScript}`],
    );
    // Issue lookups name the target repository read from its origin.
    const issueViews = f.lines('commands.jsonl').filter(({ args }) => args.includes('view'));
    assert.ok(issueViews.length > 0);
    for (const { args } of issueViews)
      assert.equal(args[args.indexOf('--repo') + 1], `sirloinbh/${name}`);
    // The change note and role prompts use the std-git-writing record path.
    const note = path.join(f.home, 'worktrees/7/docs/changes/7-add-csv-export.md');
    assert.match(fs.readFileSync(note, 'utf8'), /feat\/7-add-csv-export/);
    const prompts = f.lines('codex.jsonl');
    assert.equal(prompts.length, 3);
    for (const { input } of prompts) assert.match(input, /docs\/changes\/7-add-csv-export\.md/);
    // No publication happened before the stop request.
    assert.ok(!f.lines('commands.jsonl').some(({ args }) => args.includes('push')));
  });
}

test('a repository missing from the registry cannot queue work', (t) => {
  const f = repositoryFixture(t, { name: 'unlisted-app' });
  const result = f.invoke(['enqueue', '7']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a registered project repository/);
  assert.equal(fs.existsSync(path.join(f.home, 'jobs/7/job.json')), false);
});

test('an invalid .agents.json stops the worker before any command runs', (t) => {
  const f = repositoryFixture(t, { name: 'alpha-app', config: { autoMerge: 'yes' } });
  const result = f.invoke(['enqueue', '7']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /autoMerge must be true or false/);
  assert.equal(f.lines('commands.jsonl').length, 0);
});

test('--root must name a Git repository root', (t) => {
  const f = repositoryFixture(t, { name: 'alpha-app' });
  const missing = spawnSync(
    process.execPath,
    [path.join(f.root, 'tools/agents/cli.mjs'), '--root', path.join(f.root, 'tools'), 'status'],
    { encoding: 'utf8', windowsHide: true },
  );
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Not a Git repository root/);
  const empty = spawnSync(
    process.execPath,
    [path.join(f.root, 'tools/agents/cli.mjs'), 'status', '--root'],
    { encoding: 'utf8', windowsHide: true },
  );
  assert.notEqual(empty.status, 0);
  assert.match(empty.stderr, /--root requires/);
});
