import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { formatReport, runCheck } from '../standards-check.mjs';
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
  write('package.json', JSON.stringify({ name: 'study-log', ...pkgFields, scripts: { 'standards:check': 'node .standards/check.mjs' } }));
  write('frontend/package.json', JSON.stringify({ name: 'frontend', ...pkgFields }));
  write('backend/package.json', JSON.stringify({ name: 'backend', ...pkgFields }));
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
  assert.match(formatReport(result), /^standards-check: 통과 \(중앙 sirloinbh\/project-standards@abcdef1\)$/);
});

test('editing a managed file fails and names the central source', () => {
  const result = check(({ write, read }) => write('.editorconfig', read('.editorconfig').replace('indent_size = 2', 'indent_size = 4')));
  assert.deepEqual(result.problems, [{ group: '관리 파일', path: '.editorconfig', message: '내용이 중앙 원본과 다릅니다 (중앙 원본: templates/common/.editorconfig.tmpl)' }]);
});

test('the project section of .gitignore may change; the central section may not', () => {
  assert.deepEqual(check(({ write, read }) => write('.gitignore', `${read('.gitignore')}test-results/\n`)).problems, []);
  const result = check(({ write, read }) => write('.gitignore', read('.gitignore').replace('node_modules/\n', '')));
  assert.deepEqual(paths(result), ['관리 파일|.gitignore']);
});

test('CRLF line endings from a Windows checkout still pass', () => {
  assert.deepEqual(check(({ write, read }) => write('.editorconfig', read('.editorconfig').replace(/\n/g, '\r\n'))).problems, []);
});

test('a removed managed file and a changed package.json field fail', () => {
  const result = check(({ dir, write }) => {
    fs.rmSync(path.join(dir, '.nvmrc'));
    write('backend/package.json', JSON.stringify({ name: 'backend', packageManager: 'npm@11.19.0', engines: { node: '22.0.0', npm: '11.19.0' } }));
  });
  assert.deepEqual(result.problems.map((p) => p.message), [
    '파일이 없습니다 (중앙 원본: templates/app/.nvmrc.tmpl)',
    '관리 필드가 다릅니다: engines.node (중앙 원본: templates/index.json)',
  ]);
});

test('shared packages must have the expected version, no install scripts, and no dependencies', () => {
  const result = check(({ write }) =>
    write('node_modules/@sirloinbh/tsconfig/package.json', JSON.stringify({ version: '1.0.1', scripts: { postinstall: 'x' }, dependencies: { a: '1' } })),
  );
  assert.deepEqual(result.problems.map((p) => p.message), ['설치 버전 1.0.1, 기대 버전 1.0.0', '설치 스크립트가 있습니다: postinstall', 'dependencies가 비어 있지 않습니다']);
  const missing = check(({ dir }) => fs.rmSync(path.join(dir, 'node_modules'), { recursive: true }));
  assert.deepEqual(paths(missing), ['공유 패키지|@sirloinbh/tsconfig']);
});

test('ports and DB names that differ from the registry fail per file', () => {
  const result = check(({ write, read }) => {
    write('frontend/vite.config.ts', read('frontend/vite.config.ts').replace(String(ports.vite), '5172'));
    write('compose.yaml', read('compose.yaml').replace(`${ports.web}:80`, '8092:80'));
    write('.env.example', read('.env.example').replace(`POSTGRES_DB=${db.name}`, 'POSTGRES_DB=other'));
  });
  assert.deepEqual(result.problems.map((p) => `${p.path}: ${p.message}`), [
    `compose.yaml: 웹 포트이(가) 8092입니다. 레지스트리 값은 ${ports.web}입니다`,
    `frontend/vite.config.ts: Vite 포트이(가) 5172입니다. 레지스트리 값은 ${ports.vite}입니다`,
    '.env.example: DB 이름이(가) other입니다. 레지스트리 값은 study입니다',
  ]);
});

test('compose must pass the npm_token build secret to every build when Dockerfiles are managed', () => {
  const result = check(({ write, read }) => write('compose.yaml', read('compose.yaml').replace('build: { context: ./backend, secrets: [npm_token] }', 'build: ./backend').replace(/secrets:\n {2}npm_token:\n {4}environment: NODE_AUTH_TOKEN\n/, '')));
  assert.deepEqual(result.problems.map((p) => `${p.group}|${p.message}`), [
    '빌드 secret|최상위 secrets.npm_token.environment: NODE_AUTH_TOKEN이 없습니다',
    '빌드 secret|build 2개 중 1개만 secrets: [npm_token]을 넘깁니다',
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
  assert.deepEqual(paths(bad), ['레지스트리 값|playwright.config.ts', '레지스트리 값|playwright.config.ts']);
});

test('warns when a pattern disappears or strictPort is missing', () => {
  const result = check(({ write }) => write('frontend/vite.config.ts', 'export default {};\n'));
  assert.deepEqual(result.problems, []);
  assert.equal(result.warnings.length, 3);
  assert.ok(result.warnings.some((w) => w.includes('strictPort')));
});

test('the vendored copy runs on its own and exits 0, 1, or 2', () => {
  const run = (dir) => spawnSync(process.execPath, [path.join(dir, '.standards/check.mjs')], { encoding: 'utf8' });
  const good = makeRepo();
  const bad = makeRepo(({ write }) => write('.nvmrc', '22.0.0\n'));
  const none = makeRepo(({ dir }) => fs.rmSync(path.join(dir, MANIFEST_PATH)));
  try {
    const ok = run(good);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /standards-check: 통과/);
    const fail = run(bad);
    assert.equal(fail.status, 1);
    assert.match(fail.stderr, /✗ \.nvmrc — 내용이 중앙 원본과 다릅니다 \(중앙 원본: templates\/app\/\.nvmrc\.tmpl\)/);
    assert.match(fail.stderr, /ghp issue create -R sirloinbh\/project-standards/);
    const missing = run(none);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /manifest\.json가 없습니다/);
  } finally {
    for (const dir of [good, bad, none]) fs.rmSync(dir, { recursive: true, force: true });
  }
});
