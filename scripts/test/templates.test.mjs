import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, checkManifest } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { HEADER_TEXT, PROJECT_MARKER } from '../lib/render.mjs';
import { collectTemplates, renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const vars = buildVars(data, data.sync.targets.find((t) => t.project === 'study-log'), { centralSha: 'abcdef1234567' });
// Snapshot of study-log's files on 2026-10-22, stored as .txt so Git and npm don't read them as config.
const fixture = (name) => fs.readFileSync(path.join(root, 'scripts/test/fixtures/study-log', `${name}.txt`), 'utf8').replace(/\r\n/g, '\n');
const withoutHeader = (text) => text.split('\n').filter((line) => !line.includes(HEADER_TEXT)).join('\n');

const rendered = renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars });
const byPath = Object.fromEntries(rendered.map((f) => [f.path, f]));

test('app profile renders the shared config files with .tmpl removed', () => {
  for (const p of ['.editorconfig', '.gitattributes', '.gitignore', '.prettierignore', '.nvmrc', '.node-version', '.npmrc', 'frontend/.npmrc', 'backend/.npmrc', '.github/dependabot.yml']) {
    assert.ok(byPath[p], `${p} is rendered`);
  }
  assert.ok(rendered.every((f) => !f.path.endsWith('.tmpl')));
});

test('files that should not change match study-log today, apart from the header', () => {
  for (const [file, name] of [['.editorconfig', 'editorconfig'], ['.gitattributes', 'gitattributes'], ['.nvmrc', 'nvmrc'], ['.node-version', 'node-version']]) {
    assert.equal(withoutHeader(byPath[file].content), fixture(name), file);
  }
});

test('version files have no header because they cannot hold comments', () => {
  assert.equal(byPath['.nvmrc'].content, '24.21.0\n');
  assert.equal(byPath['.node-version'].content, '24.21.0\n');
});

test('intended differences from study-log: ignore-scripts and the project marker', () => {
  assert.equal(
    withoutHeader(byPath['.npmrc'].content),
    `${fixture('npmrc')}ignore-scripts=true\n@sirloinbh:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`,
  );
  assert.equal(withoutHeader(byPath['frontend/.npmrc'].content), withoutHeader(byPath['.npmrc'].content));
  assert.match(byPath['frontend/.npmrc'].content, /templates\/app\/frontend\/에서/);
  assert.equal(withoutHeader(byPath['.gitignore'].content), `${fixture('gitignore')}${PROJECT_MARKER}\n`);
  // study-log's ignore list stays; the managed files are added before the marker (#154).
  const prettierignore = withoutHeader(byPath['.prettierignore'].content);
  assert.ok(prettierignore.startsWith(fixture('prettierignore')));
  assert.ok(prettierignore.endsWith(`${PROJECT_MARKER}\n`));
});

// Minimal .prettierignore matching for root-anchored patterns: "dir/" covers everything below, "*" stays in one segment.
function ignoredBy(patterns, file) {
  return patterns.some((p) => {
    const body = p.replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
    return new RegExp(`^${body}${p.endsWith('/') ? '/' : '$'}`).test(file);
  });
}

test('every managed file Prettier would format is in .prettierignore, so npm run format keeps the hashes (#154)', () => {
  const patterns = withoutHeader(byPath['.prettierignore'].content).split('\n').filter((l) => l && !l.startsWith('#'));
  // Include the ui feature folder (#123), which apps get once features.ui is on.
  const withUi = renderProfile({ root, profile: 'app', folders: ['common', 'app', 'ui'], vars });
  const formatted = withUi.filter((f) => f.mode === 'full' && /\.(md|json|ya?ml|[cm]?js|tsx?|css|html)$/.test(f.path));
  assert.ok(formatted.length > 20);
  assert.deepEqual(formatted.map((f) => f.path).filter((p) => !ignoredBy(patterns, p)), []);
});

test('the app ESLint config skips the vendored central scripts (#154)', () => {
  assert.match(byPath['eslint.config.mjs'].content, /ignores: \['\.standards\/\*\*'\]/);
});

test('section files keep what the project added below the marker', () => {
  const existing = { '.gitignore': `old/\n${PROJECT_MARKER}\ntest-results/\nplaywright-report/\n` };
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars, readExisting: (p) => existing[p] ?? null });
  assert.match(files.find((f) => f.path === '.gitignore').content, new RegExp(`${PROJECT_MARKER}\ntest-results/\nplaywright-report/\n$`));
});

test('package.json fields are rendered from versions.json for all three package files', () => {
  const expected = { packageManager: 'npm@11.19.0', 'engines.node': '24.21.0', 'engines.npm': '11.19.0' };
  for (const p of ['frontend/package.json', 'backend/package.json']) {
    assert.deepEqual(byPath[p], { path: p, source: 'templates/index.json', mode: 'fields', fields: expected });
  }
  assert.deepEqual(byPath['package.json'].fields, { ...expected, 'scripts.standards:check': 'node .standards/check.mjs' });
});

test('a manifest built from the render accepts the rendered files and catches edits', () => {
  const manifest = buildManifest({ centralSha: 'test', profile: 'app', project: 'study-log', files: rendered });
  const pkg = JSON.stringify({ name: 'study-log', packageManager: 'npm@11.19.0', engines: { node: '24.21.0', npm: '11.19.0' } });
  const repo = Object.fromEntries(rendered.filter((f) => f.content).map((f) => [f.path, f.content]));
  for (const p of ['frontend/package.json', 'backend/package.json']) repo[p] = pkg;
  repo['package.json'] = JSON.stringify({ ...JSON.parse(pkg), scripts: { 'standards:check': 'node .standards/check.mjs' } });
  assert.deepEqual(checkManifest(manifest, (p) => repo[p] ?? null), []);
  repo['.editorconfig'] = repo['.editorconfig'].replace('indent_size = 2', 'indent_size = 4');
  assert.deepEqual(checkManifest(manifest, (p) => repo[p] ?? null), [{ path: '.editorconfig', reason: 'changed' }]);
});

test('the infra profile gets only common files', () => {
  const infra = collectTemplates(root, ['common', 'infra']).map((f) => f.path);
  assert.ok(infra.includes('.gitignore'));
  assert.ok(!infra.includes('.npmrc'));
  assert.ok(!infra.includes('.nvmrc'));
});

test('two folders may not produce the same target path', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-'));
  try {
    fs.mkdirSync(path.join(tmp, 'templates/common'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'templates/app'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'templates/common/.npmrc.tmpl'), 'a\n');
    fs.writeFileSync(path.join(tmp, 'templates/app/.npmrc'), 'b\n');
    assert.throws(() => collectTemplates(tmp, ['common', 'app']), /\.npmrc comes from both templates\/common\/\.npmrc\.tmpl and templates\/app\/\.npmrc/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
