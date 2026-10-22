import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { applyFields, globToRegExp, matchesAny, planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const original = loadAll(root);
const SNAPSHOT = path.join(root, 'scripts/test/fixtures/sync-snapshot.json');
const targetOf = (data, project) => data.sync.targets.find((t) => t.project === project);

test('glob patterns match whole paths with * and **', () => {
  assert.ok(globToRegExp('**/*.tf').test('main.tf'));
  assert.ok(globToRegExp('**/*.tf').test('modules/net/vpc.tf'));
  assert.ok(!globToRegExp('**/*.tf').test('main.tfvars'));
  assert.ok(globToRegExp('**/*.tfvars.*').test('prod.tfvars.example'));
  assert.ok(globToRegExp('.terraform.lock.hcl').test('.terraform.lock.hcl'));
  assert.ok(!globToRegExp('*.md').test('docs/a.md'));
  assert.ok(globToRegExp('docs/**').test('docs/a/b.md'));
  assert.ok(matchesAny('compose.yaml', ['x', 'compose.yaml']));
});

test('applyFields sets dotted fields and keeps the rest of package.json', () => {
  const text = JSON.stringify({ name: 'a', engines: { node: '22.0.0' }, scripts: { dev: 'vite' } });
  const out = applyFields(text, { 'engines.node': '24.21.0', 'engines.npm': '11.19.0', 'scripts.standards:check': 'node .standards/check.mjs', packageManager: 'npm@11.19.0' });
  assert.deepEqual(JSON.parse(out), {
    name: 'a',
    engines: { node: '24.21.0', npm: '11.19.0' },
    scripts: { dev: 'vite', 'standards:check': 'node .standards/check.mjs' },
    packageManager: 'npm@11.19.0',
  });
  assert.ok(out.endsWith('}\n') && out.includes('\n  "name": "a"'));
});

test('a plan includes the manifest with central SHA, packages, and the registry snapshot', () => {
  const plan = planTarget({ root, data: original.data, target: targetOf(original.data, 'study-log'), centralSha: 'abc1234' });
  const manifest = JSON.parse(plan.files.find((f) => f.path === MANIFEST_PATH).content);
  assert.equal(manifest.centralSha, 'abc1234');
  assert.equal(manifest.project, 'study-log');
  assert.deepEqual(manifest.registry.ports, original.data.projects.projects.find((p) => p.name === 'study-log').ports);
  assert.deepEqual(Object.keys(manifest.packages), ['@sirloinbh/eslint-config', '@sirloinbh/prettier-config', '@sirloinbh/tsconfig', '@sirloinbh/design-tokens']);
  assert.equal(plan.inRollout, false, 'maxRollout is 0, so nothing is in rollout yet');
  assert.deepEqual(plan.fieldsPending, ['backend/package.json', 'frontend/package.json', 'package.json']);
});

test('package.json fields merge into an existing file when the target is readable', () => {
  const existing = { 'package.json': JSON.stringify({ name: 'study-log', private: true }) };
  const plan = planTarget({ root, data: original.data, target: targetOf(original.data, 'study-log'), centralSha: 'x', readExisting: (p) => existing[p] ?? null });
  const pkg = JSON.parse(plan.files.find((f) => f.path === 'package.json').content);
  assert.equal(pkg.name, 'study-log');
  assert.equal(pkg.engines.node, '24.21.0');
  assert.deepEqual(plan.fieldsPending, ['backend/package.json', 'frontend/package.json']);
});

test('allowedDifferences skips a file and leaves it out of the manifest', () => {
  const copy = structuredClone(original);
  copy.data.projects.projects.find((p) => p.name === 'study-log').allowedDifferences.push({ path: '.github/dependabot.yml', reason: '시험용 예외', until: null });
  const plan = planTarget({ root, data: copy.data, target: targetOf(copy.data, 'study-log'), centralSha: 'x' });
  assert.deepEqual(plan.skipped, [{ path: '.github/dependabot.yml', reason: 'allowedDifferences' }]);
  assert.ok(!plan.files.some((f) => f.path === '.github/dependabot.yml'));
  assert.equal(plan.manifest.files['.github/dependabot.yml'], undefined);
});

test('a template that would write a protected path fails', () => {
  const copy = structuredClone(original);
  copy.data.sync.profiles.app.neverTouch = ['**/*.md'];
  assert.throws(() => planTarget({ root, data: copy.data, target: targetOf(copy.data, 'study-log'), centralSha: 'x' }), /would write protected path/);
});

// What each of the 9 repositories receives. When templates change on purpose, update the snapshot:
//   UPDATE_SNAPSHOT=1 npm test
test('the file list for all 9 targets matches the reviewed snapshot', () => {
  const actual = Object.fromEntries(
    original.data.sync.targets.map((target) => {
      const { manifest } = planTarget({ root, data: original.data, target, centralSha: 'snapshot' });
      return [target.repo, Object.entries(manifest.files).map(([p, e]) => `${e.mode} ${p}`)];
    }),
  );
  if (process.env.UPDATE_SNAPSHOT) fs.writeFileSync(SNAPSHOT, `${JSON.stringify(actual, null, 2)}\n`);
  assert.deepEqual(actual, JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')));
});

test('the dry-run CLI writes every target and plan.json', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-dry-run-'));
  try {
    const run = spawnSync(process.execPath, [path.join(root, 'scripts/sync.mjs'), '--dry-run', '--out', out, '--sha', 'cli0001'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const plan = JSON.parse(fs.readFileSync(path.join(out, 'plan.json'), 'utf8'));
    assert.equal(plan.targets.length, 9);
    assert.ok(fs.existsSync(path.join(out, 'study-log', 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(out, 'shared-aws-infrastructure', MANIFEST_PATH)));
    assert.ok(!fs.existsSync(path.join(out, 'shared-aws-infrastructure', 'AGENTS.md')));
    const rejected = spawnSync(process.execPath, [path.join(root, 'scripts/sync.mjs'), '--out', out], { encoding: 'utf8' });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /only --dry-run is available yet/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
