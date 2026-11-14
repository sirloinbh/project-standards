import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { checkApi, checkFileNames, checkZodArrays, formatReport, runCheck } from '../standards-check.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const target = data.sync.targets.find((t) => t.project === 'study-log');
const project = data.projects.projects.find((p) => p.name === 'study-log');
const { ports, db } = project;

// Files that carry registry values, written the way study-log writes them today.
const appFiles = {
  'compose.yaml': `services:\n  db:\n    ports: ['127.0.0.1:${ports.db}:5432']\n  api:\n    build: { context: ./backend, secrets: [npm_token] }\n    environment:\n      PORT: ${ports.api}\n  web:\n    build:\n      context: ./frontend\n      secrets:\n        - npm_token\n    ports: ['127.0.0.1:${ports.web}:80']\nsecrets:\n  npm_token:\n    environment: NODE_AUTH_TOKEN\n`,
  'frontend/vite.config.ts': `export default { server: { port: ${ports.vite}, strictPort: true, proxy: { '/api': 'http://127.0.0.1:${ports.api}' } } };\n`,
  'backend/src/server.ts': `const port = Number(process.env.PORT ?? ${ports.api});\n`,
  '.env.example': `POSTGRES_DB=${db.name}\nDATABASE_URL=postgres://u:p@localhost:${ports.db}/${db.name}\nPORT=${ports.api}\n`,
};

// Builds a repository that matches the standard exactly, then lets each test break one thing.
function makeRepo(edit = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-check-'));
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  for (const f of files) if (f.content !== undefined) write(f.path, f.content);
  const pkgFields = { packageManager: 'npm@11.19.0', engines: { node: '24.21.0', npm: '11.19.0' } };
  const v = data.versions.packages;
  const lint = { '@sirloinbh/eslint-config': v['@sirloinbh/eslint-config'], '@sirloinbh/prettier-config': v['@sirloinbh/prettier-config'] };
  const tsconfig = { '@sirloinbh/tsconfig': v['@sirloinbh/tsconfig'] };
  const shared = data.versions.dependencies;
  write('package.json', JSON.stringify({ name: 'study-log', ...pkgFields, scripts: { 'standards:check': 'node .standards/check.mjs', 'lockfiles:sync': 'node .standards/lockfiles.mjs --write', knip: 'knip' }, devDependencies: { ...shared.root.devDependencies, ...lint } }));
  const tokens = { '@sirloinbh/design-tokens': v['@sirloinbh/design-tokens'] };
  write('frontend/package.json', JSON.stringify({ name: 'frontend', ...pkgFields, dependencies: { ...shared.frontend.dependencies, ...tokens }, devDependencies: { ...shared.frontend.devDependencies, ...tsconfig } }));
  write('backend/package.json', JSON.stringify({ name: 'backend', ...pkgFields, dependencies: shared.backend.dependencies, devDependencies: { ...shared.backend.devDependencies, ...tsconfig } }));
  for (const [rel, text] of Object.entries(appFiles)) write(rel, text);
  write('node_modules/@sirloinbh/tsconfig/package.json', JSON.stringify({ name: '@sirloinbh/tsconfig', version: '1.0.0' }));
  const manifest = buildManifest({
    centralSha: 'abcdef1234567',
    profile: 'app',
    project: 'study-log',
    files,
    packages: { '@sirloinbh/tsconfig': '1.0.0', '@sirloinbh/design-tokens': null },
    registry: { ports, db },
  });
  write(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  edit({ dir, write, read: (rel) => fs.readFileSync(path.join(dir, rel), 'utf8') });
  return dir;
}

const check = (edit) => {
  const dir = makeRepo(edit);
  try {
    return runCheck(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
const paths = (result) => result.problems.map((p) => `${p.group}|${p.path}`);

test('a repository that matches the standard passes without warnings', () => {
  const result = check();
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.warnings, []);
  assert.match(formatReport(result), /^standards-check: passed \(central sirloinbh\/project-standards@abcdef1\)$/);
});

test('editing a managed file fails and names the central source', () => {
  const result = check(({ write, read }) => write('.editorconfig', read('.editorconfig').replace('indent_size = 2', 'indent_size = 4')));
  assert.deepEqual(result.problems, [{ group: 'managed file', path: '.editorconfig', message: 'content differs from the central source (central source: templates/common/.editorconfig.tmpl)' }]);
});

test('the project section of .gitignore may change; the central section may not', () => {
  assert.deepEqual(check(({ write, read }) => write('.gitignore', `${read('.gitignore')}test-results/\n`)).problems, []);
  const result = check(({ write, read }) => write('.gitignore', read('.gitignore').replace('node_modules/\n', '')));
  assert.deepEqual(paths(result), ['managed file|.gitignore']);
});

test('CRLF line endings from a Windows checkout still pass', () => {
  assert.deepEqual(check(({ write, read }) => write('.editorconfig', read('.editorconfig').replace(/\n/g, '\r\n'))).problems, []);
});

test('a removed managed file and a changed package.json field fail', () => {
  const result = check(({ dir, write, read }) => {
    fs.rmSync(path.join(dir, '.nvmrc'));
    const backend = JSON.parse(read('backend/package.json'));
    write('backend/package.json', JSON.stringify({ ...backend, engines: { node: '22.0.0', npm: '11.19.0' } }));
  });
  assert.deepEqual(result.problems.map((p) => p.message), [
    'file is missing (central source: templates/app/.nvmrc.tmpl)',
    'managed fields differ: engines.node (central source: templates/index.json)',
  ]);
});

test('an app whose shared dependency version differs from versions.json fails (#304)', () => {
  const result = check(({ write, read }) => {
    const frontend = JSON.parse(read('frontend/package.json'));
    frontend.devDependencies.vite = '6.4.3';
    delete frontend.dependencies.clsx;
    write('frontend/package.json', JSON.stringify(frontend));
  });
  assert.deepEqual(result.problems, [
    { group: 'managed file', path: 'frontend/package.json', message: 'managed fields differ: dependencies.clsx, devDependencies.vite (central source: templates/index.json)' },
  ]);
});

test('shared packages must have the expected version, no install scripts, and no dependencies', () => {
  const result = check(({ write }) =>
    write('node_modules/@sirloinbh/tsconfig/package.json', JSON.stringify({ version: '1.0.1', scripts: { postinstall: 'x' }, dependencies: { a: '1' } })),
  );
  assert.deepEqual(result.problems.map((p) => p.message), ['installed version 1.0.1, expected version 1.0.0', 'has install scripts: postinstall', 'dependencies is not empty']);
  const missing = check(({ dir }) => fs.rmSync(path.join(dir, 'node_modules'), { recursive: true }));
  assert.deepEqual(paths(missing), ['shared package|@sirloinbh/tsconfig']);
});

test('ports and DB names that differ from the registry fail per file', () => {
  const result = check(({ write, read }) => {
    write('frontend/vite.config.ts', read('frontend/vite.config.ts').replace(String(ports.vite), '5172'));
    write('compose.yaml', read('compose.yaml').replace(`${ports.web}:80`, '8092:80'));
    write('.env.example', read('.env.example').replace(`POSTGRES_DB=${db.name}`, 'POSTGRES_DB=other'));
  });
  assert.deepEqual(result.problems.map((p) => `${p.path}: ${p.message}`), [
    `compose.yaml: web port is 8092. The registry value is ${ports.web}`,
    `frontend/vite.config.ts: Vite port is 5172. The registry value is ${ports.vite}`,
    '.env.example: DB name is other. The registry value is study',
  ]);
});

test('compose must pass the npm_token build secret to every build when Dockerfiles are managed', () => {
  const result = check(({ write, read }) => write('compose.yaml', read('compose.yaml').replace('build: { context: ./backend, secrets: [npm_token] }', 'build: ./backend').replace(/secrets:\n {2}npm_token:\n {4}environment: NODE_AUTH_TOKEN\n/, '')));
  assert.deepEqual(result.problems.map((p) => `${p.group}|${p.message}`), [
    'build secret|top-level secrets.npm_token.environment: NODE_AUTH_TOKEN is missing',
    'build secret|only 1 of 2 builds pass secrets: [npm_token]',
  ]);
});

test('the compose form ${WEB_PORT:-8101}:80 is understood', () => {
  const result = check(({ write }) => write('compose.yaml', `ports: ['\${WEB_BIND:-127.0.0.1}:\${WEB_PORT:-${ports.web}}:80']\nports: ['127.0.0.1:\${DB_PORT:-${ports.db}}:5432']\nPORT: ${ports.api}\nsecrets:\n  npm_token:\n    environment: NODE_AUTH_TOKEN\n`));
  assert.deepEqual(result.problems, []);
});

test('playwright config must use the registry e2e ports', () => {
  const ok = check(({ write }) => write('playwright.config.ts', `const apiPort = ${ports.e2eApi};\nconst webPort = ${ports.e2eWeb};\n`));
  assert.deepEqual(ok.problems, []);
  const bad = check(({ write }) => write('playwright.config.ts', 'const apiPort = 3101;\nconst webPort = 5174;\n'));
  assert.deepEqual(paths(bad), ['registry value|playwright.config.ts', 'registry value|playwright.config.ts']);
});

test('warns when a pattern disappears or strictPort is missing', () => {
  const result = check(({ write }) => write('frontend/vite.config.ts', 'export default {};\n'));
  assert.deepEqual(result.problems, []);
  assert.equal(result.warnings.length, 3);
  assert.ok(result.warnings.some((w) => w.includes('strictPort')));
});

test('frontend/ and backend/ lockfiles must pin the versions of the root lockfile', () => {
  const entry = (version) => ({ version, resolved: `https://registry.npmjs.org/react/-/react-${version}.tgz`, integrity: `sha512-${version}` });
  const lockfiles = (subVersion) => ({ write, read }) => {
    write('package.json', JSON.stringify({ ...JSON.parse(read('package.json')), workspaces: ['frontend', 'backend'] }));
    const frontend = { name: 'frontend', dependencies: { react: '^1.0.0' } };
    write('package-lock.json', JSON.stringify({ lockfileVersion: 3, packages: { '': { name: 'study-log' }, frontend, backend: { name: 'backend' }, 'node_modules/react': entry('1.0.1') } }));
    write('frontend/package-lock.json', JSON.stringify({ lockfileVersion: 3, packages: { '': frontend, 'node_modules/react': entry(subVersion) } }));
  };
  assert.deepEqual(check(lockfiles('1.0.1')).problems, []);
  const stale = check(lockfiles('1.0.0'));
  assert.deepEqual(paths(stale), ['workspace lockfile|frontend/package-lock.json']);
  assert.match(stale.problems[0].message, /1 package\(s\) differ in version from the root package-lock\.json: react 1\.0\.0 \(root 1\.0\.1\)\. Fix with node \.standards\/lockfiles\.mjs --write/);
});

test('frontend file names must be lowercase words and hyphens (warning only, #312)', () => {
  const ok = ['frontend/src/app.tsx', 'frontend/src/vite-env.d.ts', 'frontend/src/lib/use-notice.ts', 'frontend/src/month-calendar.test.tsx', 'frontend/src/index.css', 'frontend/src/Logo.svg'];
  assert.deepEqual(checkFileNames(ok), []);
  const bad = ['frontend/src/StudyLogs.tsx', 'frontend/src/Calendar.tsx', 'frontend/src/study_logs.ts', 'frontend/src/a.tsx', 'frontend/src/B.tsx', 'frontend/src/C.tsx', 'frontend/src/D.tsx'];
  assert.deepEqual(checkFileNames(bad), ['frontend/src: file names use lowercase and hyphens (docs/conventions/code.md). 6 found: frontend/src/StudyLogs.tsx, frontend/src/Calendar.tsx, frontend/src/study_logs.ts, frontend/src/B.tsx, frontend/src/C.tsx and more']);
  const result = check(({ write }) => write('frontend/src/StudyLogs.tsx', 'export function StudyLogs() { return null; }\n'));
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.warnings, ['frontend/src: file names use lowercase and hyphens (docs/conventions/code.md). 1 found: frontend/src/StudyLogs.tsx']);
});

test('zod arrays without a length limit are warned, across lines and through other chained calls (#326)', () => {
  const text = [
    "import { z } from 'zod';",
    'const order = z.object({',
    '  ids: z',
    "    .array(z.string().regex(/^\\d+$/), { invalid_type_error: 'send a list' })",
    "    .min(1, 'at least one')",
    "    .refine((ids) => new Set(ids).size === ids.length, 'duplicate'),",
    '});',
    'const sets = z.array(z.object({ reps: z.number() })).max(100);',
    "const days = z.array(z.number()).min(1).max(7, 'max 7 days');",
    'const tags = z.string().array().length(3);',
    'const loose = z.number().array();',
  ].join('\n');
  assert.deepEqual(checkZodArrays([{ file: 'backend/src/order.ts', text }]), [
    'backend/src/order.ts:4: array schema has no length limit. Add .max(<count>) (zod security advisory GHSA-mrhx-c7xc-m3w5).',
    'backend/src/order.ts:11: array schema has no length limit. Add .max(<count>) (zod security advisory GHSA-mrhx-c7xc-m3w5).',
  ]);
  // Files that do not import zod (plain Array methods) are not read.
  assert.deepEqual(checkZodArrays([{ file: 'backend/src/x.ts', text: 'const a = rows.array(1);' }]), []);
  const result = check(({ write }) => write('backend/src/order.ts', text));
  assert.deepEqual(result.problems, []);
  assert.equal(result.warnings.filter((w) => w.includes('GHSA')).length, 2);
});

test('the vendored copy runs on its own and exits 0, 1, or 2', () => {
  const run = (dir) => spawnSync(process.execPath, [path.join(dir, '.standards/check.mjs')], { encoding: 'utf8' });
  const good = makeRepo();
  const bad = makeRepo(({ write }) => write('.nvmrc', '22.0.0\n'));
  const none = makeRepo(({ dir }) => fs.rmSync(path.join(dir, MANIFEST_PATH)));
  try {
    const ok = run(good);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /standards-check: passed/);
    const fail = run(bad);
    assert.equal(fail.status, 1);
    assert.match(fail.stderr, /✗ \.nvmrc — content differs from the central source \(central source: templates\/app\/\.nvmrc\.tmpl\)/);
    assert.match(fail.stderr, /ghp issue create -R sirloinbh\/project-standards/);
    const missing = run(none);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /manifest\.json is missing/);
  } finally {
    for (const dir of [good, bad, none]) fs.rmSync(dir, { recursive: true, force: true });
  }
});

// API rules (docs/directory-rules.md "API") are warnings only. The scaffold backend is the good example.
const scaffoldApi = ['app.ts', 'routes/health.ts', 'routes/shared.ts'].map((rel) => ({
  file: `backend/src/${rel}`,
  text: fs.readFileSync(path.join(root, 'scaffold/app/backend/src', rel), 'utf8'),
}));
const badApp = [
  "import express from 'express';",
  'export function createApp() {',
  '  const app = express();',
  "  app.get('/health', (_req, res) => res.json({ ok: true }));",
  "  app.post('/api/userList', (req, res) => res.status(400).json({ message: req.body.name }));",
  "  app.get('/api/users/:id', (req, res) => res.json({ q: req.query.q }));",
  '  return app;',
  '}',
].join('\n');

test('API rules: the scaffold backend and a repository without app.ts give no warnings', () => {
  assert.deepEqual(checkApi(scaffoldApi), []);
  assert.deepEqual(checkApi([{ file: 'backend/src/server.ts', text: 'export {};' }]), []);
});

test('API rules: health, error handler, 404, paths, error shape, and unvalidated input are warned', () => {
  assert.deepEqual(checkApi([{ file: 'backend/src/app.ts', text: badApp }]), [
    'backend/src: GET /api/health is missing. Every app has a health check API that verifies the DB connection.',
    'backend/src/app.ts: the error middleware (app.use(errorHandler)) is missing, so errors are not returned as { error }.',
    "backend/src/app.ts: app.use('/api', notFound), which answers unknown /api paths with 404 { error }, is missing.",
    'backend/src/app.ts:4: API route /health must start with /api.',
    'backend/src/app.ts:5: In API route /api/userList, "userList" must use lowercase English and hyphens.',
    "backend/src/app.ts:5: 400 response uses { message }. Error responses use { error: '<Korean message>' }.",
    'backend/src/app.ts:5: req.body.name is read without validation. Validate req.body with a Zod schema parse() first.',
    'backend/src/app.ts:6: req.query.q is read without validation. Validate req.query with a Zod schema parse() first.',
  ]);
});

test('API rules: the study-log style (inline error middleware, Routers mounted under /api) passes', () => {
  const text = [
    "app.get('/api/health', async (_req, res) => res.json({ ok: true }));",
    "app.use('/api/study-logs', studyLogRoutes(pool));",
    "app.get('/api/export/workouts.csv', exportRoute);",
    "app.post('/api/backup/' + action, restore);",
    "app.use('/api', (_req, res) => res.status(404).json({ error: 'none' }));",
    'app.use(',
    '  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {});',
  ].join('\n');
  assert.deepEqual(checkApi([{ file: 'backend/src/app.ts', text }]), []);
});

test('API rule warnings reach runCheck without failing it; tests are not scanned', () => {
  const result = check(({ write }) => {
    write('backend/src/app.ts', badApp);
    write('backend/src/app.test.ts', 'req.body.x');
  });
  assert.deepEqual(result.problems, []);
  assert.equal(result.warnings.length, 8);
  assert.ok(!result.warnings.some((w) => w.includes('app.test.ts')));
});

test('checkZodArrays warns when an array limit comes after a refinement', () => {
  const check = (chain) => checkZodArrays([{ file: 'backend/src/x.ts', text: `import { z } from 'zod/v4';\nconst a = z.array(z.string())${chain};` }]);
  assert.match(check('.refine(ok).max(3)')[0], /backend\/src\/x\.ts:2: the array \.max\(\) comes after \.refine/);
  assert.match(check('.superRefine(ok).length(3)')[0], /the array \.length\(\) comes after \.refine/);
  assert.deepEqual(check('.min(1).max(3).refine(ok)'), []);
});

test('@ssm= tags must name a shared or own-app parameter on an empty secret key (ADR-0014)', () => {
  const good = check(({ write, read }) => write('.env.example', `${read('.env.example')}# @desc Holidays @secret @used=backend @ssm=/sirloinbh/shared/data-go-kr-service-key\nHOLIDAY_API_KEY=\n`));
  assert.deepEqual(good.problems, []);
  const bad = check(({ write, read }) =>
    write(
      '.env.example',
      `${read('.env.example')}# @desc Other app @secret @ssm=/sirloinbh/money-ledger/tiingo-api-key\nTIINGO_API_KEY=\n# @desc Not secret @ssm=/sirloinbh/shared/x\nPLAIN_KEY=value\n# @desc Bad shape @secret @ssm=/sirloinbh/anthropic-api-key\nOLD_KEY=\n`,
    ),
  );
  assert.deepEqual(bad.problems.map((p) => `${p.group}|${p.message}`), [
    'SSM key|TIINGO_API_KEY: /sirloinbh/money-ledger/tiingo-api-key belongs to money-ledger; this app may read only /sirloinbh/shared/ and /sirloinbh/study-log/',
    'SSM key|PLAIN_KEY: a key read from SSM must also have @secret',
    'SSM key|PLAIN_KEY: a key read from SSM must have an empty example value',
    'SSM key|OLD_KEY: /sirloinbh/anthropic-api-key is not /sirloinbh/shared/<name> or /sirloinbh/study-log/<name> (lowercase letters, digits, hyphens)',
  ]);
});
