import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { indexErrors } from '../lib/index-check.mjs';
import { loadAll } from '../lib/registry.mjs';
import { loadIndex } from '../lib/templates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data, schemas } = loadAll(root);
const index = () => structuredClone(loadIndex(root));
const check = (edit) => {
  const copy = index();
  edit(copy);
  return indexErrors(copy, data.sync, schemas.projects);
};

test('the real templates/index.json is consistent with sync.config.json and the registry', () => {
  assert.deepEqual(indexErrors(index(), data.sync, schemas.projects), []);
});

test('a misspelled vendor profile, repository or key is reported (#863)', () => {
  const vendorEntry = (i) => i.vendor.files['backend/test/standard/tools.ts'];
  assert.match(check((i) => (vendorEntry(i).profiles = ['servce'])).join('\n'), /vendor\.files\["backend\/test\/standard\/tools\.ts"\]\.profiles: unknown profile "servce"/);
  assert.match(check((i) => (vendorEntry(i).repos = ['sirloinbh/shared-aj'])).join('\n'), /repos: "sirloinbh\/shared-aj" is not a sync target/);
  assert.match(check((i) => (vendorEntry(i).repo = ['x'])).join('\n'), /unknown key "repo"/);
  assert.match(check((i) => (i.vendor.files['.standards/x.mjs'] = { profiles: ['app'] })).join('\n'), /must be a source path or/);
});

test('a repository whose profile is not in profiles would never get the file (#863)', () => {
  const errors = check((i) => (i.vendor.files['backend/test/standard/tools.ts'].repos = ['sirloinbh/workout-memo']));
  assert.match(errors.join('\n'), /has profile "app", which is not in profiles/);
});

test('onlyWith names a known file, a <section>.<package> field and a registry feature (#863)', () => {
  assert.match(check((i) => (i.dependencyFields.onlyWith['frontend/package.json']['dependencies.zod'] = 'contrct')).join('\n'), /unknown feature "contrct"/);
  assert.match(check((i) => (i.dependencyFields.onlyWith = { 'fronted/package.json': { 'dependencies.zod': 'contract' } })).join('\n'), /"fronted\/package.json" is not one of dependencyFields\.files/);
  assert.match(check((i) => (i.dependencyFields.onlyWith['frontend/package.json'] = { zod: 'contract' })).join('\n'), /"zod" must be <section>\.<package>/);
  assert.match(check((i) => (i.dependencyFields.profiles = ['apps'])).join('\n'), /dependencyFields\.profiles: unknown profile "apps"/);
  assert.match(check((i) => (i.fields.apps = {})).join('\n'), /fields: unknown profile "apps"/);
});
