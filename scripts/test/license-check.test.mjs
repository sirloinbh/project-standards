import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALLOWED, findOutside, isAllowed, licenseText } from '../license-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'scripts/license-check.mjs');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const lock = {
  lockfileVersion: 3,
  packages: {
    '': { name: 'app', version: '1.0.0', license: 'UNLICENSED' },
    'node_modules/good': { version: '1.0.0', license: 'MIT' },
    'node_modules/either': { version: '2.0.0', license: '(GPL-3.0-only OR MIT)' },
    'node_modules/gpl': { version: '3.0.0', license: 'GPL-3.0-only' },
    'node_modules/both': { version: '1.1.0', license: '(MIT AND GPL-2.0)' },
    'node_modules/none': { version: '0.1.0' },
    'node_modules/legacy': { version: '0.2.0', licenses: [{ type: 'WTFPL' }] },
    'node_modules/@sirloinbh/auth-client': { version: '1.0.0', license: 'UNLICENSED' },
    'node_modules/linked': { link: true, resolved: 'packages/linked' },
    'node_modules/a/node_modules/nested-gpl': { version: '4.0.0', license: 'AGPL-3.0-or-later' },
  },
};

function run(args, lockfile, githubActions = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-'));
  if (lockfile) fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify(lockfile));
  return spawnSync('node', [script, '--root', dir, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: githubActions } });
}

test('a GPL-licensed dependency is reported, allowed ones and own packages are not', () => {
  const found = findOutside(lock);
  assert.deepEqual(found.map((f) => f.name), ['both', 'gpl', 'legacy', 'nested-gpl', 'none']);
  assert.equal(found.find((f) => f.name === 'gpl').license, 'GPL-3.0-only');
  assert.equal(found.find((f) => f.name === 'none').license, 'none declared');
});

test('SPDX expressions: OR needs one allowed side, AND needs all, WITH counts as the base license', () => {
  assert.equal(isAllowed('(GPL-3.0-only OR MIT)'), true);
  assert.equal(isAllowed('MIT AND GPL-2.0'), false);
  assert.equal(isAllowed('(MIT AND ISC) OR GPL-2.0'), true);
  assert.equal(isAllowed('Apache-2.0 WITH LLVM-exception'), true);
  assert.equal(isAllowed('mit'), true);
  assert.equal(isAllowed(''), false);
});

test('licenseText reads strings, objects and arrays', () => {
  assert.equal(licenseText({ license: ' MIT ' }), 'MIT');
  assert.equal(licenseText({ license: { type: 'ISC' } }), 'ISC');
  assert.equal(licenseText({ licenses: ['MIT', { type: 'ISC' }] }), 'MIT OR ISC');
  assert.equal(licenseText({}), '');
});

test('by default it warns and exits 0; --strict exits 1; no lockfile is fine', () => {
  const warn = run([], lock);
  assert.equal(warn.status, 0);
  assert.match(warn.stdout, /gpl@3\.0\.0 has license "GPL-3\.0-only"/);
  assert.equal(run(['--strict'], lock).status, 1);
  assert.equal(run(['--strict'], { packages: { 'node_modules/ok': { version: '1.0.0', license: 'ISC' } } }).status, 0);
  assert.equal(run(['--strict']).status, 0);
});

test('with GITHUB_ACTIONS set it prints workflow warning annotations', () => {
  assert.match(run([], lock, 'true').stdout, /^::warning title=license-check::gpl@3\.0\.0/m);
});

test('the policy document lists every allowed license', () => {
  const policy = read('docs/dependency-policy.md');
  for (const license of ALLOWED) assert.ok(policy.includes(`\`${license}\``), `${license} missing from docs/dependency-policy.md`);
});

test('reusable app CI runs the license check and keeps the SBOM artifact', () => {
  const ci = read('.github/workflows/reusable-app-ci.yml');
  assert.match(ci, /node \.standards\/license-check\.mjs/);
  assert.match(ci, /npm sbom [^\n]*--sbom-format cyclonedx/);
  assert.match(ci, /name: sbom/);
});
