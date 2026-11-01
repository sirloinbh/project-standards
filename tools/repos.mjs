// Works on every sirloinbh repository cloned next to this one (#276).
//   node tools/repos.mjs status [--fetch]   branch, uncommitted changes, behind/ahead of origin/main
//   node tools/repos.mjs pull               fast-forward main, only where main is checked out and clean
//   node tools/repos.mjs run -- <command>   the same command in each clone (package installs refused, npm ci too)
//   node tools/repos.mjs workspace          .local/sirloinbh.code-workspace for VS Code
// Repositories come from sync.config.json (apps and infrastructure) plus this repository.
// --base <folder> overrides the folder that holds the clones (the parent of this repository).
// Branch cleanup follows the git CLI steps in std-git-writing: nothing here switches, resets or deletes branches.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAnyInstall } from '../.claude/hooks/block-package-installs.mjs';

const central = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function repoNames(root = central) {
  const sync = JSON.parse(fs.readFileSync(path.join(root, 'sync.config.json'), 'utf8'));
  return ['project-standards', ...sync.targets.map((t) => t.repo.split('/')[1])];
}

function git(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

/** Facts for one clone, or { missing: true }. */
export function repoState(dir, { fetch = false } = {}) {
  if (!fs.existsSync(path.join(dir, '.git'))) return { missing: true };
  if (fetch) git(dir, ['fetch', '--quiet', 'origin']);
  const branch = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']).out;
  const changes = git(dir, ['status', '--porcelain']).out.split('\n').filter(Boolean).length;
  const counts = git(dir, ['rev-list', '--left-right', '--count', 'origin/main...HEAD']);
  const [behind, ahead] = counts.ok ? counts.out.split(/\s+/).map(Number) : [null, null];
  return { missing: false, branch, changes, behind, ahead };
}

export function statusTable(rows) {
  const lines = ['| 리포 | 브랜치 | 커밋 안 한 변경 | origin/main보다 뒤 / 앞 |', '|---|---|---|---|'];
  for (const { name, state: s } of rows) {
    if (s.missing) lines.push(`| ${name} | (클론 없음) | | |`);
    else lines.push(`| ${name} | ${s.branch} | ${s.changes} | ${s.behind ?? '?'} / ${s.ahead ?? '?'} |`);
  }
  return lines.join('\n');
}

/** Why pull skips a clone, or null when it can fast-forward. */
export function pullBlocker(state) {
  if (state.missing) return '클론 없음';
  if (state.branch !== 'main') return `main이 아니라 ${state.branch}에 있음`;
  if (state.changes) return `커밋 안 한 변경 ${state.changes}개`;
  return null;
}

// The file lives in <central>/.local/, so paths are relative to that folder.
export function workspaceFile(names) {
  const folders = names.map((name) => ({ name, path: name === 'project-standards' ? '..' : `../../${name}` }));
  return JSON.stringify({ folders, settings: {} }, null, 2) + '\n';
}

export function run(argv, { root = central, log = console.log } = {}) {
  const [command, ...rest] = argv;
  const opt = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const base = path.resolve(opt('base') ?? path.dirname(root));
  const names = repoNames(root);
  const dirOf = (name) => (name === 'project-standards' ? root : path.join(base, name));

  if (command === 'status') {
    log(statusTable(names.map((name) => ({ name, state: repoState(dirOf(name), { fetch: rest.includes('--fetch') }) }))));
    return 0;
  }
  if (command === 'pull') {
    let failed = 0;
    for (const name of names) {
      const dir = dirOf(name);
      const state = repoState(dir, { fetch: true });
      const blocker = pullBlocker(state);
      if (blocker) {
        log(`${name}: 건너뜀 — ${blocker}`);
        continue;
      }
      const r = git(dir, ['pull', '--ff-only', '--quiet', 'origin', 'main']);
      if (r.ok) log(`${name}: ${state.behind ? `${state.behind}개 커밋 받음` : '최신'}`);
      else {
        failed++;
        log(`${name}: 실패 — ${r.err}`);
      }
    }
    return failed ? 1 : 0;
  }
  if (command === 'run') {
    const at = rest.indexOf('--');
    const line = (at >= 0 ? rest.slice(at + 1) : rest).join(' ').trim();
    if (!line) throw new Error('사용법: node tools/repos.mjs run -- <명령>');
    const blocked = findAnyInstall(line);
    if (blocked) throw new Error(`패키지 설치·삭제·실행 명령은 여러 리포에 한꺼번에 실행하지 않습니다(${blocked}). docs/dependency-policy.md`);
    let failed = 0;
    for (const name of names) {
      const dir = dirOf(name);
      if (!fs.existsSync(dir)) {
        log(`== ${name}: 클론 없음`);
        continue;
      }
      log(`== ${name}`);
      const r = spawnSync(line, { cwd: dir, shell: true, encoding: 'utf8' });
      if (r.stdout) log(r.stdout.trimEnd());
      if (r.stderr) log(r.stderr.trimEnd());
      if (r.status !== 0) failed++;
    }
    return failed ? 1 : 0;
  }
  if (command === 'workspace') {
    const file = path.join(root, '.local', 'sirloinbh.code-workspace');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, workspaceFile(names));
    log(`${path.relative(root, file)}: 리포 ${names.length}개. VS Code에서 File → Open Workspace from File로 엽니다`);
    return 0;
  }
  throw new Error('사용법: node tools/repos.mjs status [--fetch] | pull | run -- <명령> | workspace [--base <폴더>]');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exit(run(process.argv.slice(2)));
  } catch (error) {
    console.error(`repos: ${error.message}`);
    process.exit(2);
  }
}
