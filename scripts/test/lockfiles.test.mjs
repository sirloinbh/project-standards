import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildWorkspaceLockfile, compareWorkspaceLockfile, lockfileFlags } from '../lib/lockfiles.mjs';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../lockfiles.mjs');
const pkg = (version, extra = {}) => ({ version, resolved: `https://registry.npmjs.org/x/-/x-${version}.tgz`, integrity: `sha512-${version}`, ...extra });

// frontend needs lib@1 (nested under frontend/ because backend's lib@2 is hoisted). vite has an optional peer
// tsx that only backend installs, and frontend's a@1 and b@1 need different x versions.
function rootLock() {
  return {
    name: 'app',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'app', workspaces: ['frontend', 'backend'], devDependencies: { eslint: '1.0.0' } },
      backend: { name: 'backend', version: '0.1.0', dependencies: { lib: '^2.0.0' }, devDependencies: { tsx: '1.0.0' } },
      frontend: { name: 'frontend', version: '0.1.0', dependencies: { a: '1.0.0', b: '1.0.0', lib: '^1.0.0', react: '1.0.0' }, devDependencies: { vite: '1.0.0' } },
      'frontend/node_modules/lib': pkg('1.0.0', { dependencies: { util: '^1.0.0' } }),
      'node_modules/a': pkg('1.0.0', { dependencies: { x: '^1.0.0' } }),
      'node_modules/b': pkg('1.0.0', { dependencies: { x: '^2.0.0' } }),
      'node_modules/b/node_modules/x': pkg('2.0.0'),
      'node_modules/backend': { resolved: 'backend', link: true },
      'node_modules/eslint': pkg('1.0.0', { dev: true }),
      'node_modules/frontend': { resolved: 'frontend', link: true },
      'node_modules/lib': pkg('2.0.0'),
      'node_modules/react': pkg('1.0.0'),
      'node_modules/tsx': pkg('1.0.0', { dev: true }),
      'node_modules/util': pkg('1.0.0'),
      'node_modules/vite': pkg('1.0.0', { dev: true, dependencies: { util: '^1.0.0' }, peerDependencies: { tsx: '*' }, peerDependenciesMeta: { tsx: { optional: true } } }),
      'node_modules/x': pkg('1.0.0'),
    },
  };
}

// What npm install inside frontend/ writes: every package hoisted where it does not clash.
function frontendLock() {
  const r = rootLock().packages;
  return {
    name: 'frontend',
    version: '0.1.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': r.frontend,
      'node_modules/a': r['node_modules/a'],
      'node_modules/b': r['node_modules/b'],
      'node_modules/b/node_modules/x': r['node_modules/b/node_modules/x'],
      'node_modules/lib': r['frontend/node_modules/lib'],
      'node_modules/react': r['node_modules/react'],
      'node_modules/util': r['node_modules/util'],
      'node_modules/vite': r['node_modules/vite'],
      'node_modules/x': r['node_modules/x'],
    },
  };
}

test('a workspace lockfile that pins the same versions matches, wherever packages sit', () => {
  assert.deepEqual(compareWorkspaceLockfile(rootLock(), 'frontend', frontendLock()), []);
});

test('a version that differs from the root lockfile is reported; an optional peer from another workspace is not', () => {
  const sub = frontendLock();
  sub.packages['node_modules/react'] = pkg('0.9.0');
  sub.packages['node_modules/b/node_modules/x'] = pkg('2.1.0');
  // tsx is not in the frontend lockfile; in the root lockfile vite's optional peer finds backend's copy.
  assert.deepEqual(compareWorkspaceLockfile(rootLock(), 'frontend', sub), [
    { name: 'react', workspace: ['0.9.0'], root: ['1.0.0'] },
    { name: 'x', workspace: ['1.0.0', '2.1.0'], root: ['1.0.0', '2.0.0'] },
  ]);
});

test('a missing required package is an error, not a silent pass', () => {
  const sub = frontendLock();
  delete sub.packages['node_modules/react'];
  assert.throws(() => compareWorkspaceLockfile(rootLock(), 'frontend', sub), /react을\(를\) lockfile에서 찾을 수 없습니다/);
});

test('the rebuilt workspace lockfile is what npm writes, with flags recomputed for the workspace', () => {
  const built = buildWorkspaceLockfile(rootLock(), 'frontend');
  assert.deepEqual(built, frontendLock());
  assert.deepEqual(Object.keys(built.packages), Object.keys(frontendLock().packages));
  // util is reached through lib (a dependency), so it is not dev even though vite (dev) also needs it.
  assert.equal(built.packages['node_modules/util'].dev, undefined);
  assert.equal(built.packages['node_modules/vite'].dev, true);
});

test('flags follow the workspace: a root-level prod package used only by a workspace devDependency becomes dev', () => {
  const root = rootLock();
  root.packages.frontend.devDependencies = { vite: '1.0.0', lib2: '1.0.0' };
  root.packages['node_modules/lib2'] = pkg('1.0.0');
  root.packages.backend.dependencies = { lib: '^2.0.0', lib2: '1.0.0' };
  const built = buildWorkspaceLockfile(root, 'frontend');
  assert.equal(built.packages['node_modules/lib2'].dev, true);
  assert.equal(Object.keys(built.packages['node_modules/lib2']).indexOf('dev'), 3);
  for (const [key, flags] of lockfileFlags(built)) assert.equal(Boolean(built.packages[key].dev), flags.dev, key);
});

test('bundled packages the root lockfile leaves out are kept from the previous workspace lockfile', () => {
  const root = rootLock();
  root.packages['node_modules/react'] = pkg('1.0.0', { bundleDependencies: ['tiny'], dependencies: { tiny: '1.0.0' } });
  const previous = frontendLock();
  previous.packages['node_modules/react/node_modules/tiny'] = { version: '1.0.0', inBundle: true };
  assert.deepEqual(compareWorkspaceLockfile(root, 'frontend', previous), []);
  const built = buildWorkspaceLockfile(root, 'frontend', previous);
  assert.deepEqual(built.packages['node_modules/react/node_modules/tiny'], { version: '1.0.0', inBundle: true });
});

test('the command reports a stale workspace lockfile and --write fixes it without touching matching ones', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lockfiles-'));
  const write = (rel, value) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), `${JSON.stringify(value, null, 2)}\n`);
  };
  try {
    write('package.json', { name: 'app', workspaces: ['frontend', 'backend'] });
    write('package-lock.json', rootLock());
    const stale = frontendLock();
    stale.packages['node_modules/react'] = pkg('0.9.0');
    write('frontend/package-lock.json', stale);
    const backend = buildWorkspaceLockfile(rootLock(), 'backend');
    write('backend/package-lock.json', backend);
    const backendBefore = fs.readFileSync(path.join(dir, 'backend/package-lock.json'), 'utf8');
    const run = (...args) => spawnSync(process.execPath, [script, '--root', dir, ...args], { encoding: 'utf8' });

    const check = run();
    assert.equal(check.status, 1);
    assert.match(check.stderr, /frontend\/package-lock\.json: 루트 lockfile과 다른 패키지 1개/);
    assert.match(check.stderr, /react 0\.9\.0 \(루트 1\.0\.0\)/);
    assert.match(check.stdout, /backend\/package-lock\.json: 루트 lockfile과 같습니다/);

    const fix = run('--write');
    assert.equal(fix.status, 0, fix.stderr);
    assert.match(fix.stdout, /frontend\/package-lock\.json: 다시 썼습니다 \(1개 맞춤/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'frontend/package-lock.json'), 'utf8')), frontendLock());
    assert.equal(fs.readFileSync(path.join(dir, 'backend/package-lock.json'), 'utf8'), backendBefore);
    assert.equal(run().status, 0);

    fs.rmSync(path.join(dir, 'package-lock.json'));
    assert.equal(run().status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
