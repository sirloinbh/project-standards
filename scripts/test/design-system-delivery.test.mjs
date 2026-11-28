// Sync delivers the pinned design-system release and delivers the UI kit and the screen checks from it (#1171, #1170).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { collectTemplates } from '../lib/templates.mjs';
import { externalFolders, resolveDesignSystem } from '../lib/design-system.mjs';
import { MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-release-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// A fixture design-system repository that holds a copy of the delivery folder of the pinned release (data.designSystemRelease).
const delivery = path.join(data.designSystemRelease.dir, 'delivery');
const origin = path.join(tmp, 'origin');
fs.mkdirSync(origin);
git(origin, 'init', '--quiet');
fs.cpSync(delivery, path.join(origin, 'delivery'), { recursive: true });
git(origin, 'add', '-A');
git(origin, 'commit', '--quiet', '-m', 'release');
git(origin, 'tag', 'v1.0.0');
const sha = git(origin, 'rev-parse', 'HEAD');
const pin = { repo: 'sirloinbh/design-system', version: '1.0.0', sha };
const cloneUrl = () => origin;
const resolve = (over = {}, cache = 'cache') => resolveDesignSystem({ pin: { ...pin, ...over }, cacheDir: path.join(tmp, cache), cloneUrl });

test('the repository pin starts without a version, so sync falls back to templates/ui', () => {
  assert.deepEqual(Object.keys(data.versions['design-system']).sort(), ['repo', 'sha', 'version']);
  assert.equal(resolveDesignSystem({ pin: { repo: 'sirloinbh/design-system', version: null, sha: null }, cacheDir: path.join(tmp, 'none') }), null);
  assert.deepEqual(externalFolders(null), {});
});

test('a missing pin, a pin without sha, a missing tag, a moved tag and a release without delivery/ui fail clearly', () => {
  assert.throws(() => resolveDesignSystem({ pin: undefined, cacheDir: tmp }), /"design-system" pin is missing/);
  assert.throws(() => resolve({ sha: null }, 'c1'), /has no "sha"/);
  assert.throws(() => resolve({ version: '9.9.9', sha: 'a'.repeat(40) }, 'c2'), /could not fetch sirloinbh\/design-system v9\.9\.9/);
  assert.throws(() => resolve({ sha: 'b'.repeat(40) }, 'c3'), /pins b{40}\. The tag moved or the pin is wrong/);
  fs.rmSync(path.join(origin, 'delivery'), { recursive: true });
  git(origin, 'add', '-A');
  git(origin, 'commit', '--quiet', '-m', 'empty release');
  git(origin, 'tag', 'v2.0.0');
  assert.throws(() => resolve({ version: '2.0.0', sha: git(origin, 'rev-parse', 'HEAD') }, 'c4'), /has no delivery\/ui\/ folder/);
});

test('a release is cloned once per tag and reused from the cache', () => {
  const first = resolve({}, 'cached');
  assert.equal(first.tag, 'v1.0.0');
  assert.ok(fs.existsSync(path.join(first.dir, 'delivery/ui')));
  // The origin is gone, yet the cached copy still resolves (its commit is checked again).
  fs.renameSync(origin, `${origin}-gone`);
  try {
    assert.equal(resolve({}, 'cached').sha, sha);
  } finally {
    fs.renameSync(`${origin}-gone`, origin);
  }
});

test('a copy of the release delivers the same files as the pinned release', () => {
  const target = data.sync.targets.find((t) => t.repo === 'sirloinbh/workout-memo');
  const before = planTarget({ root, data, target, centralSha: 'c'.repeat(40) });
  const release = resolve({}, 'plan');
  const after = planTarget({ root, data: { ...data, designSystemRelease: release }, target, centralSha: 'c'.repeat(40) });
  const content = (plan) => plan.files.filter((f) => f.path !== MANIFEST_PATH).map((f) => [f.path, f.mode, f.content]);
  assert.deepEqual(content(after), content(before));
  assert.deepEqual(Object.entries(after.manifest.files).map(([p, e]) => [p, e.mode, e.sha256]), Object.entries(before.manifest.files).map(([p, e]) => [p, e.mode, e.sha256]), 'hashes are unchanged; only the source note of the delivered files differs');
  const button = after.files.find((f) => f.path === 'frontend/src/components/ui/button.tsx');
  assert.equal(button.source, 'design-system/delivery/ui/frontend/src/components/ui/button.tsx');
  assert.equal(before.files.find((f) => f.path === button.path).source, button.source);
});

test('files that stay in project-standards are still delivered next to a release; the release wins on the same path (#1207)', () => {
  const dir = fs.mkdtempSync(path.join(tmp, 'overlay-'));
  const write = (p, text) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
  write(path.join(dir, 'central/templates/ui/frontend/src/sign-in.tsx'), 'local sign-in');
  write(path.join(dir, 'central/templates/ui/frontend/src/button.tsx'), 'old button');
  write(path.join(dir, 'release/frontend/src/button.tsx'), 'new button');
  const files = collectTemplates(path.join(dir, 'central'), ['ui'], { ui: { dir: path.join(dir, 'release'), label: 'design-system/delivery/ui' } });
  const byPath = Object.fromEntries(files.map((f) => [f.path, f]));
  assert.deepEqual(Object.keys(byPath).sort(), ['frontend/src/button.tsx', 'frontend/src/sign-in.tsx']);
  assert.equal(fs.readFileSync(byPath['frontend/src/button.tsx'].file, 'utf8'), 'new button');
  assert.equal(byPath['frontend/src/sign-in.tsx'].source, 'templates/ui/frontend/src/sign-in.tsx');
});

test('an app that turned the ui feature off gets no delivered files', () => {
  const copy = structuredClone(data);
  const project = copy.projects.projects.find((p) => p.name === 'workout-memo');
  project.features.ui = false;
  const target = copy.sync.targets.find((t) => t.repo === 'sirloinbh/workout-memo');
  const plan = planTarget({ root, data: { ...copy, designSystemRelease: resolve({}, 'plan2') }, target, centralSha: 'd'.repeat(40) });
  assert.ok(!plan.files.some((f) => f.source.startsWith('design-system/delivery/ui/')));
});

test('the screen checks come from the pinned release', () => {
  const target = data.sync.targets.find((t) => t.repo === 'sirloinbh/workout-memo');
  const before = planTarget({ root, data, target, centralSha: 'e'.repeat(40) });
  const after = planTarget({ root, data: { ...data, designSystemRelease: resolve({}, 'screen') }, target, centralSha: 'e'.repeat(40) });
  const find = (plan) => plan.files.find((f) => f.path === '.standards/lib/screen-checks.mjs');
  assert.equal(find(before).source, 'design-system/delivery/standards/screen-checks.mjs');
  assert.equal(find(after).source, 'design-system/delivery/standards/screen-checks.mjs');
  assert.equal(find(after).content, find(before).content);
  // A release that changes the module changes what the apps receive.
  const changed = path.join(tmp, 'screen-release');
  fs.cpSync(path.join(tmp, 'screen'), changed, { recursive: true });
  fs.appendFileSync(path.join(changed, '1.0.0/delivery/standards/screen-checks.mjs'), '// changed in the release');
  const next = planTarget({ root, data: { ...data, designSystemRelease: { ...resolve({}, 'screen'), dir: path.join(changed, '1.0.0') } }, target, centralSha: 'e'.repeat(40) });
  assert.match(find(next).content, /changed in the release/);
});

test('a release without the screen checks module fails clearly', () => {
  const bare = path.join(tmp, 'bare');
  fs.mkdirSync(bare);
  git(bare, 'init', '--quiet');
  fs.cpSync(path.join(delivery, 'ui'), path.join(bare, 'delivery/ui'), { recursive: true });
  git(bare, 'add', '-A');
  git(bare, 'commit', '--quiet', '-m', 'release');
  git(bare, 'tag', 'v3.0.0');
  assert.throws(() => resolveDesignSystem({ pin: { ...pin, version: '3.0.0', sha: git(bare, 'rev-parse', 'HEAD') }, cacheDir: path.join(tmp, 'c-bare'), cloneUrl: () => bare }), /has no delivery.standards.screen-checks.mjs/);
});
