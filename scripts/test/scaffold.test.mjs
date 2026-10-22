import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkAll, loadAll } from '../lib/registry.mjs';
import { CONTRACT_COPIES, packageVars, renderScaffold, RUNBOOKS, writeScaffold } from '../scaffold.mjs';
import { runCheck } from '../standards-check.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const sha = 'a'.repeat(40);

// A virtual project in slot 99, built by the slot formula (docs/design.md 6.1).
function withSlot99() {
  const loaded = loadAll(root);
  const data = structuredClone(loaded.data);
  data.projects.projects.push({
    slot: 99,
    status: 'active',
    name: 'sample-app',
    title: '샘플',
    displayName: '샘플 · 스캐폴드 확인용',
    domain: '샘플',
    summary: '스캐폴드 렌더링을 확인하는 가상 프로젝트.',
    repos: { umbrella: 'sample-app', frontend: 'sample-app-frontend', backend: 'sample-app-backend', db: 'sample-app-db' },
    ports: { web: 8199, api: 3199, e2eApi: 3299, vite: 5299, e2eWeb: 5399, db: 15499 },
    db: { name: 'sample', testName: 'sample_test' },
    service: { domain: null, subdomain: null },
    aws: { prefix: null },
    features: { e2e: true, openapi: false, contract: true, ui: true },
    skills: [],
    allowedDifferences: [],
  });
  data.sync.targets.push({ repo: 'sirloinbh/sample-app', profile: 'app', project: 'sample-app', rollout: 99 });
  return { data, schemas: loaded.schemas };
}

const slot99 = withSlot99();
const files = renderScaffold({ data: slot99.data, project: 'sample-app', centralSha: sha });
const byPath = new Map(files.map((f) => [f.path, f.content]));

test('the slot 99 project is a valid registry entry', () => {
  assert.deepEqual(checkAll(slot99).errors, []);
});

test('renders without leftover template variables (GitHub ${{ }} expressions stay)', () => {
  // .standards/ holds vendored central scripts, copied without rendering; their source mentions {{ }}.
  for (const { path: file, content } of files.filter((f) => typeof f.content === 'string' && !f.path.startsWith('.standards/'))) assert.doesNotMatch(content, /(?<!\$)\{\{/, file);
  assert.ok(!files.some((f) => f.path.endsWith('.tmpl')));
});

test('includes the standard tree, operations docs, managed files and the manifest', () => {
  for (const file of [
    'AGENTS.project.md', 'README.md', 'compose.yaml', '.env.example', 'playwright.config.ts', 'shared/contract.ts',
    'frontend/src/app.tsx', 'frontend/src/lib/utils.ts', 'backend/src/routes/health.ts', 'backend/src/migrate.ts', 'backend/src/migrations.ts', 'backend/test/migrations.test.ts',
    'database/migrations/001_init.sql', 'e2e/overview.spec.ts', ...Object.values(RUNBOOKS), ...CONTRACT_COPIES,
    'AGENTS.md', '.npmrc', '.gitignore', '.github/workflows/ci.yml', 'frontend/Dockerfile', '.standards/check.mjs', '.standards/manifest.json',
  ]) assert.ok(byPath.has(file), file);
  for (const copy of CONTRACT_COPIES) assert.equal(byPath.get(copy), byPath.get('shared/contract.ts'));
  assert.match(byPath.get('.npmrc'), /^ignore-scripts=true$/m);
});

test('the migration runner keeps the history table and lock key documented in docs/conventions/database.md', () => {
  const runner = byPath.get('backend/src/migrations.ts');
  const doc = fs.readFileSync(path.join(root, 'docs/conventions/database.md'), 'utf8');
  for (const token of ['schema_migrations', 'name text PRIMARY KEY', 'checksum text NOT NULL', 'applied_at timestamptz NOT NULL', '581_003', '^(\\d{3})_[a-z0-9_]+\\.sql$']) {
    assert.ok(runner.includes(token), `runner: ${token}`);
    assert.ok(doc.includes(token), `doc: ${token}`);
  }
  assert.match(byPath.get('backend/package.json'), /"db:migrate": "tsx --env-file-if-exists=\.\.\/\.env src\/migrate\.ts"/);
  assert.match(byPath.get('package.json'), /"db:migrate": "npm run db:migrate -w backend --"/);
});

test('the rendered repository passes standards-check with no problems or warnings', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-'));
  try {
    writeScaffold(files, dir);
    const { problems, warnings } = runCheck(dir);
    assert.deepEqual(problems, []);
    assert.deepEqual(warnings, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('dependencies are exact and match the dependency policy table and own packages', () => {
  const policy = new Map();
  for (const line of fs.readFileSync(path.join(root, 'docs/dependency-policy.md'), 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length > 4 && /^\d+\.\d+\.\d+$/.test(cells[3])) for (const name of cells[1].split(',')) policy.set(name.trim(), cells[3]);
  }
  const own = packageVars(root);
  const checked = [];
  for (const file of ['package.json', 'frontend/package.json', 'backend/package.json']) {
    const pkg = JSON.parse(byPath.get(file));
    for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      assert.match(version, /^\d+\.\d+\.\d+$/, `${file} ${name}`);
      if (policy.has(name)) {
        assert.equal(version, policy.get(name), `${file} ${name}`);
        checked.push(name);
      }
      if (name.startsWith('@sirloinbh/')) assert.ok(Object.values(own).includes(version), `${file} ${name}`);
    }
    assert.equal(pkg.packageManager, `npm@${slot99.data.versions.npm}`);
  }
  assert.ok(checked.includes('react') && checked.includes('express') && checked.includes('vite'));
});

test('every registered project renders', () => {
  const { data } = loadAll(root);
  for (const target of data.sync.targets.filter((t) => t.profile === 'app')) {
    assert.ok(renderScaffold({ data, project: target.project, centralSha: sha }).length > 40, target.project);
  }
});

test('refuses to write into a folder that is not empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-'));
  try {
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'x');
    assert.throws(() => writeScaffold(files, dir), /is not empty/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI explains its usage', () => {
  assert.throws(() => execFileSync(process.execPath, [path.join(root, 'scripts/scaffold.mjs')], { stdio: 'pipe' }), (e) => e.status === 2 && /Usage/.test(e.stderr));
});
