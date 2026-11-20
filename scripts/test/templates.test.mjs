import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, checkManifest } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { hasHeader, PROJECT_MARKER } from '../lib/render.mjs';
import { applyFields } from '../lib/sync-plan.mjs';
import { collectTemplates, loadIndex, renderProfile, sharedDependencyFields } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const vars = buildVars(data, data.sync.targets.find((t) => t.project === 'study-log'), { centralSha: 'abcdef1234567' });
// Snapshot of study-log's files on 2026-10-22, stored as .txt so Git and npm don't read them as config.
const fixture = (name) => fs.readFileSync(path.join(root, 'scripts/test/fixtures/study-log', `${name}.txt`), 'utf8').replace(/\r\n/g, '\n');
const withoutHeader = (text) => text.split('\n').filter((line) => !hasHeader(line)).join('\n');

const rendered = renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app'], vars });
const byPath = Object.fromEntries(rendered.map((f) => [f.path, f]));

test('an optional dependency is written only into a package.json that already lists it (#704)', () => {
  const index = loadIndex(root);
  const versions = { ...data.versions, optionalDependencies: { frontend: { devDependencies: { '@testing-library/user-event': '14.6.8' } } } };
  const has = { devDependencies: { '@testing-library/user-event': '14.6.7' } };
  const key = 'devDependencies.@testing-library/user-event';
  assert.equal(sharedDependencyFields(index, 'app', versions, (t) => (t === 'frontend/package.json' ? has : null))['frontend/package.json'][key], '14.6.8');
  assert.equal(sharedDependencyFields(index, 'app', versions, () => null)['frontend/package.json'][key], undefined, 'an app without the package gets nothing');
  assert.equal(sharedDependencyFields(index, 'app', versions, () => ({ dependencies: {} }))['frontend/package.json'][key], undefined);
  const both = { ...data.versions, optionalDependencies: { frontend: { devDependencies: { vite: '6.4.5' } } } };
  assert.throws(() => sharedDependencyFields(index, 'app', both, () => ({ devDependencies: { vite: '6.4.5' } })), /vite is in both dependencies and optionalDependencies/);
});

test('app profile renders the shared config files with .tmpl removed', () => {
  for (const p of ['.editorconfig', '.gitattributes', '.gitignore', '.prettierignore', '.nvmrc', '.node-version', '.npmrc', '.dockerignore', '.github/dependabot.yml']) {
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
  // Tool outputs and personal settings every app produces were added to the shared section (#323).
  const toolOutputs = ['.claude/settings.local.json', '*.tfvars', 'test-results/', 'playwright-report/', 'blob-report/', 'coverage/', '.lighthouseci/', '*.tsbuildinfo'];
  assert.equal(withoutHeader(byPath['.gitignore'].content), `${fixture('gitignore')}${toolOutputs.join('\n')}\n${PROJECT_MARKER}\n`);
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
  // Include the feature folders (ui #123, e2e and vitest #33), which apps get once the feature is on.
  const withUi = renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app', 'ui', 'e2e', 'vitest', 'lighthouse', 'msw', 'query'], vars });
  const formatted = withUi.filter((f) => f.mode === 'full' && /\.(md|json|ya?ml|[cm]?js|tsx?|css|html)$/.test(f.path));
  assert.ok(formatted.length > 20);
  assert.deepEqual(formatted.map((f) => f.path).filter((p) => !ignoredBy(patterns, p)), []);
});

test('the Tailwind Prettier plugin keeps the spaces in class strings (#246)', () => {
  // Without it `row${on ? ' top' : ''}` loses its space and the class becomes "rowtop".
  assert.match(byPath['prettier.config.mjs'].content, /tailwindPreserveWhitespace: true/);
});

test('the app ESLint config skips the vendored central scripts (#154)', () => {
  assert.match(byPath['eslint.config.mjs'].content, /ignores: \['\.standards\/\*\*'\]/);
});

test('the app ESLint config takes the named react-refresh export, whose configs.vite is a function (#246)', () => {
  // eslint-plugin-react-refresh 0.5 also has a default export, but its configs.vite is a plain object.
  assert.match(byPath['eslint.config.mjs'].content, /^import \{ reactRefresh \} from 'eslint-plugin-react-refresh';$/m);
});

test('section files keep what the project added below the marker', () => {
  const existing = { '.gitignore': `old/\n${PROJECT_MARKER}\ntest-results/\nplaywright-report/\n` };
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app'], vars, readExisting: (p) => existing[p] ?? null });
  assert.match(files.find((f) => f.path === '.gitignore').content, new RegExp(`${PROJECT_MARKER}\ntest-results/\nplaywright-report/\n$`));
});

test('package.json fields are rendered from versions.json for all three package files', () => {
  const expected = { packageManager: 'npm@11.19.0', 'engines.node': '24.21.0', 'engines.npm': '11.19.0' };
  const tsconfig = { 'devDependencies.@sirloinbh/tsconfig': '1.0.0' };
  const shared = sharedDependencyFields(loadIndex(root), 'app', data.versions);
  assert.deepEqual(byPath['backend/package.json'], { path: 'backend/package.json', source: 'templates/index.json', mode: 'fields', fields: { ...expected, 'dependencies.@sirloinbh/auth-client': '1.0.0', ...tsconfig, ...shared['backend/package.json'] } });
  assert.deepEqual(byPath['frontend/package.json'], {
    path: 'frontend/package.json',
    source: 'templates/index.json',
    mode: 'fields',
    fields: { ...expected, 'dependencies.@sirloinbh/auth-client': '1.0.0', 'dependencies.@sirloinbh/design-tokens': '1.0.0', ...tsconfig, ...shared['frontend/package.json'] },
  });
  assert.deepEqual(byPath['package.json'].fields, {
    ...expected,
    ...shared['package.json'],
    'scripts.standards:check': 'node .standards/check.mjs',
    'scripts.knip': 'knip',
    'devDependencies.@sirloinbh/eslint-config': data.versions.packages['@sirloinbh/eslint-config'],
    'devDependencies.@sirloinbh/prettier-config': '1.0.0',
  });
});

test('versions.json dependencies become managed fields of the app package files only (#304)', () => {
  const index = loadIndex(root);
  const shared = sharedDependencyFields(index, 'app', data.versions);
  assert.equal(shared['frontend/package.json']['devDependencies.vite'], data.versions.dependencies.frontend.devDependencies.vite);
  assert.equal(shared['backend/package.json']['dependencies.zod'], data.versions.dependencies.backend.dependencies.zod);
  assert.equal(shared['package.json']['devDependencies.eslint'], data.versions.dependencies.root.devDependencies.eslint);
  assert.deepEqual(sharedDependencyFields(index, 'infra', data.versions), {});
  const dotted = structuredClone(data.versions);
  dotted.dependencies.frontend.dependencies['tesseract.js'] = '7.0.0';
  assert.throws(() => sharedDependencyFields(index, 'app', dotted), /"tesseract\.js" contains a dot/);
  const twice = structuredClone(data);
  twice.versions.dependencies.root.devDependencies['@sirloinbh/eslint-config'] = '1.0.0';
  assert.throws(() => renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app'], vars: buildVars(twice, data.sync.targets[0], { centralSha: 'x' }) }), /set by both templates\/index\.json fields and versions\.json dependencies/);
});

test('a manifest built from the render accepts the rendered files and catches edits', () => {
  const manifest = buildManifest({ centralSha: 'test', profile: 'app', project: 'study-log', files: rendered });
  const pkg = { name: 'study-log', packageManager: 'npm@11.19.0', engines: { node: '24.21.0', npm: '11.19.0' } };
  const repo = Object.fromEntries(rendered.filter((f) => f.content).map((f) => [f.path, f.content]));
  for (const f of rendered.filter((x) => x.mode === 'fields')) repo[f.path] = applyFields(JSON.stringify(pkg), f.fields);
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

test('the tool-token verifier files are vendored to shared-ai only, copied as they are (#672)', () => {
  const paths = ['backend/test/standard/tools.ts', 'backend/test/standard/audit.ts', 'backend/test/standard/db.ts'];
  const render = (repo) => renderProfile({ root, profile: 'service', folders: ['common', 'deploy', 'backend', 'service'], vars: buildVars(data, data.sync.targets.find((t) => t.repo === repo), { centralSha: 'abcdef1234567' }) });
  const ai = render('sirloinbh/shared-ai');
  for (const target of paths) {
    const file = ai.find((f) => f.path === target);
    assert.ok(file, `${target} reaches shared-ai`);
    assert.equal(withoutHeader(file.content), withoutHeader(fs.readFileSync(path.join(root, file.source), 'utf8').replace(/\r\n/g, '\n')));
    assert.equal(byPath[target], undefined, `${target} is not sent to the app profile`);
    assert.equal(render('sirloinbh/shared-auth').find((f) => f.path === target), undefined, `${target} is not sent to shared-auth`);
  }
});

test('apps build from the repo root: one root .dockerignore and no per-folder .npmrc or .dockerignore (ADR-0022, #770)', () => {
  assert.ok(byPath['.dockerignore'], 'root .dockerignore');
  for (const p of ['frontend/.dockerignore', 'frontend/.npmrc', 'backend/.dockerignore', 'backend/.npmrc']) assert.equal(byPath[p], undefined, `${p} is not rendered`);
  for (const p of ['frontend/Dockerfile', 'backend/Dockerfile']) assert.match(byPath[p].content, /docker build -f (frontend|backend)\/Dockerfile \./, `${p} says it builds from the root`);
});

test('the frontend zod version is managed only where the frontend already lists it, so apps without a contract get none (#783)', () => {
  const index = loadIndex(root);
  assert.equal(data.versions.dependencies.frontend.dependencies.zod, undefined, 'zod is not a dependency every app must have');
  const field = 'dependencies.zod';
  const frontend = (pkg) => sharedDependencyFields(index, 'app', data.versions, (t) => (t === 'frontend/package.json' ? pkg : null), { contract: true })['frontend/package.json'];
  assert.equal(frontend({ dependencies: { zod: '4.6.0' } })[field], data.versions.optionalDependencies.frontend.dependencies.zod);
  assert.equal(frontend({ dependencies: {} })[field], undefined);
  assert.equal(frontend(null)[field], undefined);
});

test('the frontend zod field is not recorded for an app without features.contract, even when its package.json still lists it (#783)', () => {
  const index = loadIndex(root);
  const pkg = { dependencies: { zod: '4.6.7' } };
  const field = (features) => sharedDependencyFields(index, 'app', data.versions, (t) => (t === 'frontend/package.json' ? pkg : null), features)['frontend/package.json']?.['dependencies.zod'];
  assert.equal(field({ contract: true }), data.versions.optionalDependencies.frontend.dependencies.zod);
  assert.equal(field({ contract: false }), undefined);
  assert.equal(field({}), undefined);
});
