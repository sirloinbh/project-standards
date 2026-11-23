import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll, serviceHost } from '../lib/registry.mjs';
import { ADOPTION_RULES, checkAdoption, checkApi, checkComposeDeploy, checkComposeWarnings, checkFileNames, checkZodArrays, formatReport, rangeVersions, runCheck } from '../standards-check.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const target = data.sync.targets.find((t) => t.project === 'study-log');
const project = data.projects.projects.find((p) => p.name === 'study-log');
const { ports, db } = project;
const host = serviceHost(project, data.platform);

// Files that carry registry values, written the way study-log writes them today. (frontend/vite.config.ts is a managed
// template with the ports filled in since #680, so the rendered one is used.)
const appFiles = {
  'compose.yaml': `services:\n  db:\n    ports: ['127.0.0.1:${ports.db}:5432']\n  api:\n    build: { context: ./backend, secrets: [npm_token] }\n    image: ${db.name}-backend:\${IMAGE_TAG:-local}\n    environment:\n      PORT: ${ports.api}\n    healthcheck:\n      test: x\n  web:\n    build:\n      context: ./frontend\n      secrets:\n        - npm_token\n    image: ${db.name}-frontend:\${IMAGE_TAG:-local}\n    ports: ['\${WEB_BIND:-127.0.0.1}:\${WEB_PORT:-${ports.web}}:80']\nsecrets:\n  npm_token:\n    environment: NODE_AUTH_TOKEN\n`,
  'backend/src/server.ts': `const port = Number(process.env.PORT ?? ${ports.api});\nconst host = listenHost(auth !== undefined);\n`,
  '.env.example': `POSTGRES_DB=${db.name}\nDATABASE_URL=postgres://u:p@localhost:${ports.db}/${db.name}\nPORT=${ports.api}\n`,
};

// Builds a repository that matches the standard exactly, then lets each test break one thing.
function makeRepo(edit = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-check-'));
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
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
  write('package.json', JSON.stringify({ name: 'study-log', ...pkgFields, scripts: { 'db:migrate': 'npm run db:migrate -w backend --', 'standards:check': 'node .standards/check.mjs', knip: 'knip' }, devDependencies: { ...shared.root.devDependencies, ...lint } }));
  const tokens = { '@sirloinbh/design-tokens': v['@sirloinbh/design-tokens'] };
  const auth = { '@sirloinbh/auth-client': v['@sirloinbh/auth-client'] };
  write('frontend/package.json', JSON.stringify({ name: 'frontend', ...pkgFields, dependencies: { ...shared.frontend.dependencies, ...tokens, ...auth }, devDependencies: { ...shared.frontend.devDependencies, ...tsconfig } }));
  write('backend/package.json', JSON.stringify({ name: 'backend', ...pkgFields, dependencies: { ...shared.backend.dependencies, ...auth }, devDependencies: { ...shared.backend.devDependencies, ...tsconfig } }));
  for (const [rel, text] of Object.entries(appFiles)) write(rel, text);
  write('node_modules/@sirloinbh/tsconfig/package.json', JSON.stringify({ name: '@sirloinbh/tsconfig', version: '1.0.0' }));
  const manifest = buildManifest({
    centralSha: 'abcdef1234567',
    profile: 'app',
    project: 'study-log',
    files,
    packages: { '@sirloinbh/tsconfig': '1.0.0', '@sirloinbh/design-tokens': null },
    registry: { ports, db, host },
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
    write('compose.yaml', read('compose.yaml').replace(`${ports.web}}:80`, '8092}:80'));
    write('.env.example', read('.env.example').replace(`POSTGRES_DB=${db.name}`, 'POSTGRES_DB=other'));
  });
  // The edited vite.config.ts is also a changed managed file (#680); this test is about the registry values.
  assert.deepEqual(result.problems.filter((p) => p.group !== 'managed file').map((p) => `${p.path}: ${p.message}`), [
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

test('an nginx server_name that differs from the registry subdomain fails (#254)', () => {
  assert.equal(host, 'study-log.daysofme.com');
  const result = check(({ write, read }) => write('frontend/nginx.conf', read('frontend/nginx.conf').replace(`server_name ${host};`, 'server_name study.example.com;')));
  assert.ok(result.problems.some((x) => x.path === 'frontend/nginx.conf' && x.message === `server_name is study.example.com. The registry value is ${host}`), JSON.stringify(result.problems));
});

test('the compose form ${WEB_PORT:-8101}:80 is understood', () => {
  const result = check(({ write }) => write('compose.yaml', `image: ${db.name}-backend:\${IMAGE_TAG}\nimage: ${db.name}-frontend:\${IMAGE_TAG}\nports: ['\${WEB_BIND:-127.0.0.1}:\${WEB_PORT:-${ports.web}}:80']\nports: ['127.0.0.1:\${DB_PORT:-${ports.db}}:5432']\nPORT: ${ports.api}\nsecrets:\n  npm_token:\n    environment: NODE_AUTH_TOKEN\n`));
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
  // The file is managed since #680, so replacing it is also a managed-file problem; the pattern warnings still show.
  assert.deepEqual(paths(result), ['managed file|frontend/vite.config.ts']);
  assert.equal(result.warnings.length, 3);
  assert.ok(result.warnings.some((w) => w.includes('strictPort')));
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
    'backend/src/app.ts: app.use(requestLog) is missing, so requests get no request ID or JSON log line (docs/logging.md).',
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
    'app.use(requestLog);',
    "app.post('/internal/tools/:name', callTool);",
    "app.use('/api/study-logs', studyLogRoutes(pool));",
    "app.get('/api/export/workouts.csv', exportRoute);",
    "app.post('/api/backup/' + action, restore);",
    "app.use('/api', (_req, res) => res.status(404).json({ error: 'none' }));",
    'app.use(',
    '  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {});',
  ].join('\n');
  assert.deepEqual(checkApi([{ file: 'backend/src/app.ts', text }]), []);
});

test('API rules: requestLog mounted after a route is warned, mounted first passes', () => {
  const body = (order) => ["app.get('/api/health', h);", ...order, 'app.use(errorHandler);', "app.use('/api', notFound);"].join('\n');
  const late = checkApi([{ file: 'backend/src/app.ts', text: body(["app.use('/api/items', items);", 'app.use(requestLog);']) }]);
  assert.deepEqual(late, ['backend/src/app.ts:2: app.use(requestLog) must be mounted before the routes, or they get no request ID or JSON log line (docs/logging.md).']);
  assert.deepEqual(checkApi([{ file: 'backend/src/app.ts', text: body(['app.use(requestLog);', "app.use('/api/items', items);"]) }]), []);
});

test('^ and ~ dependency versions fail the check; exact versions pass (#701)', () => {
  assert.deepEqual(rangeVersions({ dependencies: { a: '1.0.0', b: '^2.0.0' }, devDependencies: { c: '~3.1.0' }, optionalDependencies: { d: '4.0.0' } }), ['dependencies.b ^2.0.0', 'devDependencies.c ~3.1.0']);
  const result = check(({ write, read }) => {
    const pkg = JSON.parse(read('package.json'));
    write('package.json', JSON.stringify({ ...pkg, devDependencies: { ...pkg.devDependencies, concurrently: '^9.2.0' } }));
  });
  assert.deepEqual(result.problems.filter((p) => p.group === 'version range').map((p) => p.message), ['devDependencies.concurrently ^9.2.0 must be an exact version']);
});

test('API rule warnings reach runCheck without failing it; tests are not scanned', () => {
  const result = check(({ write }) => {
    write('backend/src/app.ts', badApp);
    write('backend/src/app.test.ts', 'req.body.x');
  });
  assert.deepEqual(result.problems, []);
  // 9 API warnings, plus the 2 adoption warnings (apiRateLimit, setInt8Parser) because this app.ts calls neither (#1035).
  assert.equal(result.warnings.length, 11);
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

test('a bare line in .env.example fails the check (#969)', () => {
  const bad = check(({ write, read }) => write('.env.example', `${read('.env.example')}# one line with\n escapes). Set: x\nA_KEY=\n`));
  assert.deepEqual(bad.problems.filter((p) => p.group === 'env example').map((p) => p.message), [
    'line 5 is not blank, a # comment, or KEY=value (a comment split by a real line break?): escapes). Set: x',
  ]);
  assert.deepEqual(check().problems.filter((p) => p.group === 'env example'), []);
});

test('compose deploy contract: image tags, WEB_BIND/WEB_PORT, no initdb mount, $$ healthcheck, root db:migrate (#695)', () => {
  const edit = (from, to) => ({ write, read }) => write('compose.yaml', read('compose.yaml').replace(from, to));
  const messages = (result) => result.problems.filter((p) => p.group === 'deploy contract').map((p) => p.message);
  assert.deepEqual(messages(check()), []);
  assert.match(messages(check(edit(`image: ${db.name}-backend:\${IMAGE_TAG:-local}`, `image: ${db.name}-backend:latest`))).join('\n'), /backend:\$\{IMAGE_TAG\} is missing/);
  assert.match(messages(check(edit(`'\${WEB_BIND:-127.0.0.1}:\${WEB_PORT:-${ports.web}}:80'`, `'127.0.0.1:${ports.web}:80'`))).join('\n'), /WEB_BIND/);
  assert.match(messages(check(edit('  db:\n', '  db:\n    volumes: [./database/migrations:/docker-entrypoint-initdb.d:ro]\n'))).join('\n'), /initdb/);
  assert.match(messages(check(edit('  db:\n', "  db:\n    healthcheck: { test: ['CMD-SHELL', 'pg_isready -U $POSTGRES_USER'] }\n"))).join('\n'), /\$\$POSTGRES_USER/);
  const noMigrate = check(({ write }) => write('package.json', JSON.stringify({ name: 'study-log', packageManager: 'npm@11.19.0', engines: { node: '24.21.0', npm: '11.19.0' }, scripts: { 'standards:check': 'node .standards/check.mjs' } })));
  assert.ok(messages(noMigrate).some((m) => m.includes('db:migrate')));
});

test('checkComposeDeploy accepts the ${VAR:-default} forms', () => {
  const ok = "image: x-backend:${IMAGE_TAG}\nimage: x-frontend:${IMAGE_TAG:-local}\nports: ['${WEB_BIND}:${WEB_PORT}:80']\n";
  assert.deepEqual(checkComposeDeploy(ok, { dbName: 'x', scripts: { 'db:migrate': 'x' } }), []);
});

test('a compose api service without a healthcheck is a warning, not a failure (#875)', () => {
  const without = 'services:\n  db:\n    healthcheck:\n      test: x\n  api:\n    image: x-backend:${IMAGE_TAG}\n    restart: unless-stopped\n  web:\n    depends_on: [api]\n';
  assert.match(checkComposeWarnings(without).join('\n'), /the api service has no healthcheck/);
  const withCheck = without.replace('    restart: unless-stopped\n  web:', '    healthcheck:\n      test: x\n    restart: unless-stopped\n  web:');
  assert.deepEqual(checkComposeWarnings(withCheck), []);
  assert.deepEqual(checkComposeWarnings('services:\n  db:\n    image: x\n'), [], 'no api service, nothing to warn about');
  assert.deepEqual(checkComposeDeploy(without, { dbName: 'x', scripts: { 'db:migrate': 'x' } }).filter((m) => /healthcheck/.test(m)), [], 'the deploy-contract failures do not include it');
});

// Adoption rules (#906): a managed helper that the repo-owned file does not use is a warning, only where the helper exists.
const src = (file, text) => ({ file, text });
const managedAll = { 'backend/src/standard/auth.ts': {}, 'backend/src/standard/db.ts': {}, 'backend/src/standard/tools.ts': {} };

test('adoption rules: the export names each helper, its managed file and its repo-owned file', () => {
  assert.deepEqual(ADOPTION_RULES.map((r) => [r.id, r.helper]), [['listen-host', 'listenHost'], ['create-pool', 'createPool'], ['tool-routes', 'registerToolRoutes'], ['api-rate-limit', 'apiRateLimit'], ['int8-parser', 'setInt8Parser']]);
  for (const rule of ADOPTION_RULES) {
    assert.ok(rule.managedFile.startsWith('backend/src/standard/') && rule.ownedFile && typeof rule.check === 'function' && typeof rule.applies === 'function', rule.id);
  }
});

test('adoption rules: listenHost must be used by server.ts (#866, #898)', () => {
  const literal = [src('backend/src/server.ts', "createApp(pool).listen(port, '0.0.0.0', () => {});\n")];
  assert.match(checkAdoption(literal, managedAll).join('\n'), /backend\/src\/server\.ts: listen on `listenHost\(auth !== undefined\)`/);
  const adopted = [src('backend/src/server.ts', 'const auth = sharedAuth();\ncreateApp(pool, { auth }).listen(port, listenHost(auth !== undefined), () => {});\n')];
  assert.deepEqual(checkAdoption(adopted, managedAll), []);
  assert.deepEqual(checkAdoption(literal, {}), [], 'without the managed auth.ts the helper does not exist, so nothing is asked');
  assert.deepEqual(checkAdoption([src('backend/src/app.ts', '')], { 'backend/src/standard/auth.ts': {} }), [], 'no server.ts, nothing to check');
});

test('adoption rules: a pool created with new Pool must go through createPool (ADR-0025)', () => {
  const bare = [src('backend/src/server.ts', 'const pool = new Pool({ connectionString });\n')];
  assert.match(checkAdoption(bare, { 'backend/src/standard/db.ts': {} }).join('\n'), /backend\/src\/server\.ts: wrap the pool with createPool\(new Pool/);
  const wrapped = [src('backend/src/pool.ts', 'export const connectPool = (u) => createPool(new Pool({ connectionString: u }));\n')];
  assert.deepEqual(checkAdoption(wrapped, { 'backend/src/standard/db.ts': {} }), []);
  assert.deepEqual(checkAdoption([src('backend/src/standard/db.ts', 'new Pool(')], { 'backend/src/standard/db.ts': {} }), [], 'the managed file itself is not checked');
  assert.deepEqual(checkAdoption([src('backend/src/import-words.ts', 'const pool = new Pool({ connectionString });\n')], { 'backend/src/standard/db.ts': {} }), [], 'a one-off import script is not asked');
});

test('adoption rules: an app with ai-tools.ts must register the tool routes with requireBinding and pass the public key', () => {
  const only = { 'backend/src/standard/tools.ts': {} };
  const noRoutes = [src('backend/src/ai-tools.ts', 'export const tools = [];\n'), src('backend/src/app.ts', 'app.use(x);\n'), src('backend/src/server.ts', 'createApp(pool);\n')];
  const text = checkAdoption(noRoutes, only).join('\n');
  assert.match(text, /app\.ts: ai-tools\.ts exists but registerToolRoutes/);
  assert.match(text, /server\.ts: pass toolsPublicKey: process\.env\.AI_TOOLS_PUBLIC_KEY/);
  const noBinding = [src('backend/src/ai-tools.ts', ''), src('backend/src/app.ts', 'registerToolRoutes(app, { app: "x", tools, pool, publicKey });\n'), src('backend/src/server.ts', 'toolsPublicKey: process.env.AI_TOOLS_PUBLIC_KEY')];
  assert.match(checkAdoption(noBinding, only).join('\n'), /needs requireBinding: true/);
  const ok = [src('backend/src/ai-tools.ts', ''), src('backend/src/app.ts', 'registerToolRoutes(app, { app: "x", tools, pool, publicKey, requireBinding: true });\n'), src('backend/src/server.ts', 'toolsPublicKey: process.env.AI_TOOLS_PUBLIC_KEY')];
  assert.deepEqual(checkAdoption(ok, only), []);
  assert.deepEqual(checkAdoption([src('backend/src/app.ts', 'app.use(x);\n')], only), [], 'no ai-tools.ts, no tools to register');
});

test('adoption rules: apiRateLimit must be called in app.ts before express.json (#678, #1035)', () => {
  const managed = { 'backend/src/standard/rate-limit.ts': {} };
  const missing = [src('backend/src/app.ts', "app.use(requestLog);\napp.use(express.json({ limit: '256kb' }));\n")];
  assert.match(checkAdoption(missing, managed).join('\n'), /app\.ts: call apiRateLimit\(app\)/);
  const late = [src('backend/src/app.ts', 'app.use(express.json());\napiRateLimit(app);\n')];
  assert.match(checkAdoption(late, managed).join('\n'), /apiRateLimit\(app\) must run before express\.json\(\)/);
  const ok = [src('backend/src/app.ts', 'app.use(requestLog);\napiRateLimit(app);\napp.use(express.json());\n')];
  assert.deepEqual(checkAdoption(ok, managed), []);
  assert.deepEqual(checkAdoption(missing, {}), [], 'without the managed rate-limit.ts nothing is asked');
  assert.deepEqual(checkAdoption([src('backend/src/server.ts', '')], managed), [], 'no app.ts, nothing to check');
});

test('adoption rules: setInt8Parser must be called once outside standard/ (ADR-0025, #778, #1035)', () => {
  const managed = { 'backend/src/standard/db.ts': {} };
  const none = [src('backend/src/app.ts', 'const app = express();\n'), src('backend/src/standard/db.ts', 'export function setInt8Parser(types) {}\n')];
  assert.match(checkAdoption(none, managed).join('\n'), /app\.ts: call setInt8Parser\(types\)/);
  assert.deepEqual(checkAdoption([src('backend/src/app.ts', 'setInt8Parser(types);\n')], managed), []);
  const inPool = [src('backend/src/app.ts', 'const app = express();\n'), src('backend/src/pool.ts', 'setInt8Parser(types);\n')];
  assert.deepEqual(checkAdoption(inPool, managed), [], 'life-journal calls it in pool.ts');
  assert.deepEqual(checkAdoption(none, {}), []);
});

test('adoption warnings reach runCheck without failing it', () => {
  const result = check(({ write }) => write('backend/src/server.ts', "createApp(pool).listen(3101, '0.0.0.0', () => {});\n"));
  assert.equal(result.problems.length, 0);
});
