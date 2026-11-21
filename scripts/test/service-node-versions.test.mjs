// The shared services take their Node and npm versions from versions.json (#959, ADR-0029 gap G2).
// backend/.npmrc (managed) sets engine-strict=true, so a hand-pinned `engines` would fail `npm ci` after a central version bump.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const services = data.sync.targets.filter((t) => t.profile === 'service');
const existing = { 'backend/package.json': `${JSON.stringify({ name: 'backend', private: true, packageManager: 'npm@1.0.0', engines: { node: '1.0.0', npm: '1.0.0' }, dependencies: { express: '5.2.1' } }, null, 2)}\n` };
const plan = (target, d = data) => planTarget({ root, data: d, target, centralSha: 'a'.repeat(40), readExisting: (p) => existing[p] ?? null });

test('both services get managed Node and npm versions in backend/package.json', () => {
  assert.equal(services.length, 2);
  for (const target of services) {
    const { files, manifest } = plan(target);
    assert.deepEqual(manifest.files['backend/package.json'], {
      mode: 'fields',
      fields: { packageManager: `npm@${data.versions.npm}`, 'engines.node': data.versions.node, 'engines.npm': data.versions.npm },
      source: 'templates/index.json',
    });
    const pkg = JSON.parse(files.find((f) => f.path === 'backend/package.json').content);
    assert.deepEqual(pkg.engines, { node: data.versions.node, npm: data.versions.npm }, target.repo);
    assert.equal(pkg.packageManager, `npm@${data.versions.npm}`);
    // Only the managed fields change; the service keeps pinning its own dependencies.
    assert.deepEqual(pkg.dependencies, { express: '5.2.1' });
    assert.equal(pkg.name, 'backend');
  }
});

test('a central Node bump reaches the engines field, the Dockerfile, and the version files together', () => {
  const bumped = structuredClone(data);
  bumped.versions.node = '99.1.2';
  const { files } = plan(services[0], bumped);
  const text = (p) => files.find((f) => f.path === p).content;
  assert.equal(JSON.parse(text('backend/package.json')).engines.node, '99.1.2');
  assert.match(text('.nvmrc'), /^99\.1\.2\n$/);
  assert.match(text('.node-version'), /^99\.1\.2\n$/);
  assert.match(text('.github/workflows/ci.yml'), /node-version: '99\.1\.2'/);
});

test('backend/package.json is the only repo-owned backend file sync may write, and only by fields', () => {
  const profile = data.sync.profiles.service;
  assert.ok(profile.neverTouch.includes('backend/**'));
  assert.ok(profile.neverTouchExcept.includes('backend/package.json'));
  const index = JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8'));
  assert.deepEqual(Object.keys(index.fields.service), ['backend/package.json']);
  assert.ok(!fs.existsSync(path.join(root, 'templates/service/backend/package.json')), 'never a full template');
});

test('the service Dependabot config is security-only and reads the backend lockfile', () => {
  const text = fs.readFileSync(path.join(root, 'templates/service/.github/dependabot.yml'), 'utf8');
  const entries = text.split(/^ {2}- package-ecosystem: /m).slice(1);
  assert.deepEqual(entries.map((e) => e.split('\n')[0]), ['npm', 'github-actions']);
  for (const e of entries) assert.match(e, /^ {4}open-pull-requests-limit: 0$/m);
  assert.match(entries[0], /^ {4}directory: \/backend$/m);
  for (const group of ['security-minor-patch', 'security-major']) assert.match(entries[0], new RegExp(`^ {6}${group}:\n {8}applies-to: security-updates$`, 'm'));
});
