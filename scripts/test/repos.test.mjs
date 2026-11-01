// tools/repos.mjs (#276): status, pull, run and a VS Code workspace across the sirloinbh clones.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { pullBlocker, repoNames, repoState, run, workspaceFile } from '../../tools/repos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main'];
const git = (cwd, ...args) => {
  const r = spawnSync('git', [...G, ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

// A fake central folder with sync.config.json naming two apps, and clones of a shared origin.
function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repos-'));
  const origin = path.join(dir, 'origin.git');
  fs.mkdirSync(origin);
  git(origin, 'init', '-q', '--bare');
  const seed = path.join(dir, 'seed');
  fs.mkdirSync(seed);
  git(seed, 'init', '-q');
  fs.writeFileSync(path.join(seed, 'a.txt'), '1\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-qm', 'one');
  git(seed, 'remote', 'add', 'origin', origin);
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  const base = path.join(dir, 'clones');
  fs.mkdirSync(base);
  for (const name of ['project-standards', 'app-a', 'app-b']) git(base, 'clone', '-q', origin, name);
  const centralDir = path.join(base, 'project-standards');
  fs.writeFileSync(path.join(centralDir, 'sync.config.json'), JSON.stringify({ targets: [{ repo: 'sirloinbh/app-a' }, { repo: 'sirloinbh/app-b' }, { repo: 'sirloinbh/app-c' }] }));
  // origin moves ahead by one commit
  fs.writeFileSync(path.join(seed, 'a.txt'), '2\n');
  git(seed, 'commit', '-qam', 'two');
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  return { dir, base, centralDir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('the repository list is this repository plus every sync target', () => {
  const names = repoNames(root);
  assert.equal(names[0], 'project-standards');
  assert.ok(names.includes('workout-memo') && names.includes('shared-aws-infrastructure'));
});

test('status reports branch, changes and how far behind origin/main each clone is', () => {
  const s = setup();
  try {
    fs.writeFileSync(path.join(s.base, 'app-b/new.txt'), 'x');
    const lines = [];
    assert.equal(run(['status', '--fetch'], { root: s.centralDir, log: (l) => lines.push(l) }), 0);
    const table = lines.join('\n');
    assert.match(table, /^\| app-a \| main \| 0 \| 1 \/ 0 \|$/m);
    assert.match(table, /^\| app-b \| main \| 1 \| 1 \/ 0 \|$/m);
    assert.match(table, /^\| app-c \| \(클론 없음\) \| \| \|$/m);
  } finally {
    s.cleanup();
  }
});

test('pull fast-forwards only clean clones on main and explains every skip', () => {
  const s = setup();
  try {
    fs.writeFileSync(path.join(s.base, 'app-b/new.txt'), 'x');
    git(path.join(s.base, 'project-standards'), 'switch', '-q', '-c', 'feat/1-x');
    const lines = [];
    assert.equal(run(['pull'], { root: s.centralDir, log: (l) => lines.push(l) }), 0);
    assert.deepEqual(lines, ['project-standards: 건너뜀 — main이 아니라 feat/1-x에 있음', 'app-a: 1개 커밋 받음', 'app-b: 건너뜀 — 커밋 안 한 변경 1개', 'app-c: 건너뜀 — 클론 없음']);
    // trim(): core.autocrlf may check files out with CRLF on Windows.
    assert.equal(fs.readFileSync(path.join(s.base, 'app-a/a.txt'), 'utf8').trim(), '2');
    assert.equal(fs.readFileSync(path.join(s.base, 'app-b/a.txt'), 'utf8').trim(), '1');
    assert.equal(repoState(path.join(s.base, 'project-standards')).branch, 'feat/1-x', 'the branch is left as it was');
  } finally {
    s.cleanup();
  }
});

test('run executes the same command in each clone and refuses package installs', () => {
  const s = setup();
  try {
    const lines = [];
    assert.equal(run(['run', '--', 'git rev-parse --abbrev-ref HEAD'], { root: s.centralDir, log: (l) => lines.push(l) }), 0);
    assert.deepEqual(lines, ['== project-standards', 'main', '== app-a', 'main', '== app-b', 'main', '== app-c: 클론 없음']);
    for (const bad of ['npm install', 'npm --silent i react', 'npx prettier .', 'npm ci', 'npm ic --ignore-scripts']) assert.throws(() => run(['run', '--', ...bad.split(' ')], { root: s.centralDir, log: () => {} }), /한꺼번에 실행하지 않습니다/, bad);
  } finally {
    s.cleanup();
  }
});

test('workspace writes a VS Code multi-root file under .local with paths relative to it', () => {
  const s = setup();
  try {
    assert.equal(run(['workspace'], { root: s.centralDir, log: () => {} }), 0);
    const file = JSON.parse(fs.readFileSync(path.join(s.centralDir, '.local/sirloinbh.code-workspace'), 'utf8'));
    assert.deepEqual(file.folders, [
      { name: 'project-standards', path: '..' },
      { name: 'app-a', path: '../../app-a' },
      { name: 'app-b', path: '../../app-b' },
      { name: 'app-c', path: '../../app-c' },
    ]);
    assert.deepEqual(JSON.parse(workspaceFile(['project-standards'])).folders, [{ name: 'project-standards', path: '..' }]);
  } finally {
    s.cleanup();
  }
});

test('pullBlocker covers each reason', () => {
  assert.equal(pullBlocker({ missing: true }), '클론 없음');
  assert.equal(pullBlocker({ missing: false, branch: 'main', changes: 0 }), null);
});
