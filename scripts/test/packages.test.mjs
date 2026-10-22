import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderTailwindCss, renderTokensCss } from '../build-tokens.mjs';
import { checkAll, checkPackage, checkTag } from '../package-guard.mjs';
import { createConfig } from '../../packages/eslint-config/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const json = (rel) => JSON.parse(read(rel));
const fixture = (name) => fs.readFileSync(path.join(root, 'scripts/test/fixtures/study-log', `${name}.txt`), 'utf8');
const tokens = json('design/tokens.json');

test('all four packages pass package-guard', () => {
  assert.deepEqual(checkAll(root), []);
  assert.deepEqual(fs.readdirSync(path.join(root, 'packages')).sort(), ['design-tokens', 'eslint-config', 'prettier-config', 'tsconfig']);
});

test('package-guard rejects dependencies, install scripts, ranges, privacy, and a missing CHANGELOG entry', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'guard-')), 'bad');
  try {
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name: '@sirloinbh/bad', version: '1.0.0', private: true, files: ['index.js'],
      dependencies: { left: '1.0.0' }, scripts: { postinstall: 'node x.js' }, peerDependencies: { eslint: '^10.0.0' },
      publishConfig: { registry: 'https://registry.npmjs.org' }, repository: { url: 'https://github.com/someone/else' },
    }));
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# 변경 기록\n\n## 0.9.0\n');
    assert.deepEqual(checkPackage(dir).map((p) => p.replace('packages/bad: ', '')), [
      'must not be private (it is published)',
      'dependencies must be empty',
      'install script "postinstall" is not allowed',
      'peerDependency eslint must be pinned exactly, got ^10.0.0',
      'publishConfig.registry must be https://npm.pkg.github.com',
      'repository must point to sirloinbh/project-standards',
      'files lists index.js, which does not exist',
      'CHANGELOG.md has no "## 1.0.0" entry',
    ]);
  } finally {
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test('a release tag must match the package version', () => {
  assert.deepEqual(checkTag(root, 'eslint-config/v1.0.0'), []);
  assert.deepEqual(checkTag(root, 'eslint-config/v1.0.1'), ['tag eslint-config/v1.0.1: packages/eslint-config is version 1.0.0']);
  assert.deepEqual(checkTag(root, 'v1.0.0'), ['tag v1.0.0 must look like <package>/v<x.y.z>']);
});

test('the ESLint factory builds the same config as the apps use today', () => {
  const stub = {
    js: { configs: { recommended: { name: 'js-recommended' } } },
    tseslint: { configs: { recommended: [{ name: 'ts-1' }, { name: 'ts-2' }] }, config: (...items) => items },
    globals: { node: { process: 'readonly' }, browser: { window: 'readonly' } },
    reactHooks: { name: 'react-hooks-plugin' },
    prettier: { name: 'prettier' },
  };
  const config = createConfig(stub);
  assert.deepEqual(config.map((c) => c.name ?? Object.keys(c).join('+')), ['ignores', 'js-recommended', 'ts-1', 'ts-2', 'files+languageOptions+rules', 'files+languageOptions+plugins+rules', 'prettier']);
  assert.deepEqual(config[0].ignores, ['**/node_modules/**', '**/dist/**', '.local/**']);
  assert.deepEqual(config[4].rules['@typescript-eslint/no-unused-vars'], ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]);
  assert.deepEqual(config[5].rules, { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' });
  assert.equal(config[5].files[0], 'frontend/src/**/*.{ts,tsx}');
  // The same rules appear in study-log's eslint.config.mjs today.
  const today = fixture('eslint.config.mjs');
  for (const rule of ["'react-hooks/rules-of-hooks': 'error'", "'react-hooks/exhaustive-deps': 'error'", "argsIgnorePattern: '^_'", "files: ['frontend/src/**/*.{ts,tsx}']"]) assert.ok(today.includes(rule), rule);
  assert.deepEqual(createConfig(stub, { ignores: ['e2e/**'] })[0].ignores.at(-1), 'e2e/**');
});

test('prettier and tsconfig packages match the files the apps have today', () => {
  assert.deepEqual(json('packages/prettier-config/index.json'), JSON.parse(fixture('prettierrc.json')));
  const base = json('packages/tsconfig/base.json').compilerOptions;
  const frontendToday = JSON.parse(fixture('frontend-tsconfig.json'));
  assert.deepEqual({ ...base, ...json('packages/tsconfig/react-app.json').compilerOptions }, frontendToday.compilerOptions);
  const backendToday = JSON.parse(fixture('backend-tsconfig.json'));
  const backend = { ...base, ...json('packages/tsconfig/node-api.json').compilerOptions };
  assert.equal(backend.outDir, '${configDir}/dist', 'outDir resolves next to the app tsconfig, i.e. backend/dist');
  assert.deepEqual({ ...backend, outDir: 'dist' }, backendToday.compilerOptions);
});

test('the design-tokens CSS is generated from design/tokens.json and committed', () => {
  assert.equal(read('packages/design-tokens/tokens.css'), renderTokensCss(tokens), 'run `npm run tokens`');
  assert.equal(read('packages/design-tokens/tailwind.css'), renderTailwindCss(tokens), 'run `npm run tokens`');
  const css = renderTokensCss(tokens);
  for (const c of tokens.color.light) assert.ok(css.includes(`  --${c.name}: `), c.name);
  // Dark colors apply with <html class="dark">, and with the system setting unless <html class="light">.
  assert.match(css, /\n\.dark \{\n {2}color-scheme: dark;\n {2}--background: oklch\(0\.145 0 0\);/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\.light\) \{\n {4}color-scheme: dark;/);
  assert.match(renderTailwindCss(tokens), /@custom-variant dark \{\n {2}&:where\(\.dark, \.dark \*\) \{/);
  const tw = renderTailwindCss(tokens);
  for (const u of ['text-body', 'text-body-sm', 'text-caption', 'text-meta']) assert.ok(tw.includes(`@utility ${u} {`), u);
  assert.match(tw, /@media \(min-width: 48rem\) \{\n {4}h1 \{\n {6}font-size: var\(--text-3xl\);/);
});

test('the bundled Pretendard files match the recorded hashes', () => {
  const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
  assert.equal(sha('packages/design-tokens/fonts/PretendardVariable.woff2'), tokens.font.pretendard.files['PretendardVariable.woff2']);
  assert.equal(sha('packages/design-tokens/fonts/LICENSE-Pretendard.txt'), tokens.font.pretendard.files['LICENSE.txt']);
  assert.match(read('packages/design-tokens/fonts/LICENSE-Pretendard.txt'), /SIL Open Font License, Version 1\.1/);
});
