import assert from 'node:assert/strict';
import test from 'node:test';
import { canonical, centralSection, pickFields, sha256 } from '../lib/hash.mjs';
import { buildManifest, checkEntry, checkManifest } from '../lib/manifest.mjs';
import { PROJECT_MARKER } from '../lib/render.mjs';

const gitignore = `node_modules/\n.env\n${PROJECT_MARKER}\ntest-results/\n`;
const pkg = { name: 'study-log', packageManager: 'npm@11.19.0', engines: { node: '24.21.0', npm: '11.19.0' } };

test('hashes ignore CRLF and a leading BOM', () => {
  assert.equal(sha256('a\r\nb\r\n'), sha256('a\nb\n'));
  assert.equal(sha256('﻿a\n'), sha256('a\n'));
  assert.notEqual(sha256('a\n'), sha256('a \n'));
});

test('central section includes the marker and excludes the project part', () => {
  assert.equal(centralSection(gitignore), `node_modules/\n.env\n${PROJECT_MARKER}`);
  assert.equal(centralSection('no marker'), null);
});

test('field picking and canonical JSON ignore key order', () => {
  assert.deepEqual(pickFields(pkg, ['engines.node', 'packageManager', 'missing.x']), { 'engines.node': '24.21.0', packageManager: 'npm@11.19.0', 'missing.x': undefined });
  assert.equal(canonical({ b: 1, a: [1, { d: 2, c: 3 }] }), canonical({ a: [1, { c: 3, d: 2 }], b: 1 }));
});

const manifest = buildManifest({
  centralSha: 'abc1234',
  profile: 'app',
  project: 'study-log',
  files: [
    { path: '.editorconfig', mode: 'full', content: 'root = true\n' },
    { path: '.gitignore', mode: 'section', content: gitignore },
    { path: 'package.json', mode: 'fields', fields: { packageManager: 'npm@11.19.0', engines: { node: '24.21.0', npm: '11.19.0' } } },
  ],
  packages: { '@sirloinbh/tsconfig': '1.0.0' },
});

test('builds a sorted manifest with a hash per managed file', () => {
  assert.deepEqual(Object.keys(manifest.files), ['.editorconfig', '.gitignore', 'package.json']);
  assert.equal(manifest.files['.editorconfig'].sha256, sha256('root = true\n'));
  assert.equal(manifest.files['.gitignore'].sha256, sha256(`node_modules/\n.env\n${PROJECT_MARKER}`));
  assert.equal(manifest.centralSha, 'abc1234');
});

test('rejects unknown modes, duplicates, and section files without a marker', () => {
  const base = { centralSha: 'x', profile: 'app', project: 'p' };
  assert.throws(() => buildManifest({ ...base, files: [{ path: 'a', mode: 'partial', content: '' }] }), /unknown mode/);
  assert.throws(() => buildManifest({ ...base, files: [{ path: 'a', mode: 'full', content: '' }, { path: 'a', mode: 'full', content: '' }] }), /listed twice/);
  assert.throws(() => buildManifest({ ...base, files: [{ path: '.gitignore', mode: 'section', content: 'x\n' }] }), /no project marker/);
});

test('a matching repository has no problems, even with CRLF and project-section edits', () => {
  const files = {
    '.editorconfig': 'root = true\r\n',
    '.gitignore': `node_modules/\n.env\n${PROJECT_MARKER}\nplaywright-report/\nother/\n`,
    'package.json': JSON.stringify({ ...pkg, scripts: { dev: 'vite' } }),
  };
  assert.deepEqual(checkManifest(manifest, (p) => files[p] ?? null), []);
});

test('reports changed, missing, and field problems', () => {
  const files = {
    '.gitignore': `node_modules/\n${PROJECT_MARKER}\n`,
    'package.json': JSON.stringify({ ...pkg, engines: { node: '22.0.0', npm: '11.19.0' } }),
  };
  assert.deepEqual(checkManifest(manifest, (p) => files[p] ?? null), [
    { path: '.editorconfig', reason: 'missing' },
    { path: '.gitignore', reason: 'central section changed' },
    { path: 'package.json', reason: 'field(s) changed: engines' },
  ]);
  assert.equal(checkEntry(manifest.files['.gitignore'], 'node_modules/\n'), 'project marker removed');
  assert.equal(checkEntry(manifest.files['package.json'], '{ broken'), 'not valid JSON');
  assert.equal(checkEntry(manifest.files['.editorconfig'], 'root = false\n'), 'changed');
});
