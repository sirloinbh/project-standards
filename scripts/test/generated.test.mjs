import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderGeneratedFiles } from '../lib/generated.mjs';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

// Files generated from registry data for shared-ai and the Terraform repo (#705).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const target = (repo) => data.sync.targets.find((t) => t.repo === `sirloinbh/${repo}`);
const planned = (repo, d = data) => planTarget({ root, data: d, target: target(repo), centralSha: 'abc1234' }).files;

test('shared-ai gets the active apps with their API ports as a TypeScript list', () => {
  const file = planned('shared-ai').find((f) => f.path === 'backend/src/apps.generated.ts');
  assert.ok(file, 'backend/src/apps.generated.ts is planned');
  assert.match(file.content, /^\/\/ Managed file\./);
  const lines = file.content.split('\n').filter((l) => /^  \['/.test(l));
  const active = data.projects.projects.filter((p) => p.status === 'active');
  assert.equal(lines.length, 8);
  assert.deepEqual(lines, active.map((p) => `  ['${p.name}', ${p.ports.api}],`));
});

test('the infra repo gets apps.json with the apps, the reserved subdomains, and the apps whose SSM keys the server reads', () => {
  const file = planned('shared-aws-infrastructure').find((f) => f.path === 'apps.json');
  const json = JSON.parse(file.content);
  assert.equal(json.apps.length, 8);
  assert.deepEqual(json.sharedServices, ['auth', 'ai']);
  assert.deepEqual(json.secretApps, [...json.apps, 'shared-auth', 'shared-ai']);
});

test('shared-auth and the apps get neither generated file', () => {
  for (const repo of ['shared-auth', 'workout-memo']) {
    const paths = planned(repo).map((f) => f.path);
    assert.ok(!paths.includes('apps.json') && !paths.includes('backend/src/apps.generated.ts'), repo);
  }
});

test('adding an active app to the registry changes both files, and a retired app drops out', () => {
  const copy = structuredClone(data);
  const first = copy.projects.projects[0];
  first.status = 'retired';
  const ts = planned('shared-ai', copy).find((f) => f.path === 'backend/src/apps.generated.ts').content;
  assert.ok(!ts.includes(`'${first.name}'`));
  const json = JSON.parse(planned('shared-aws-infrastructure', copy).find((f) => f.path === 'apps.json').content);
  assert.ok(!json.apps.includes(first.name));
});

test('the generated file may sit under a neverTouch pattern only through neverTouchExcept', () => {
  const copy = structuredClone(data);
  copy.sync.profiles.service.neverTouchExcept = ['backend/test/standard/*.ts', 'backend/Dockerfile', 'backend/.npmrc', 'backend/.dockerignore'];
  assert.throws(() => planned('shared-ai', copy), /would write protected path backend\/src\/apps\.generated\.ts/);
});

test('an unknown generated kind is an error', () => {
  assert.throws(() => renderGeneratedFiles({ generatedFiles: { 'x.txt': 'nope' } }, data), /unknown kind "nope"/);
});
