import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { envMismatches, parseEnvExample, renderCompliance, renderEnvMatrix, repoStatus } from '../lib/compliance.mjs';
import { buildManifest, MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { publishReports, remoteStatuses, renderReports, withoutStamp } from '../compliance.mjs';
import { fakeRepo } from './fake-github.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const study = data.projects.projects.find((p) => p.name === 'study-log');
const studyTarget = data.sync.targets.find((t) => t.project === 'study-log');
const meta = { generatedAt: '2026-10-22 00:00 UTC', centralSha: 'abcdef1234567' };

const annotated = [
  '# @desc PostgreSQL DB 이름 @required @used=compose',
  'POSTGRES_DB=study',
  '# @desc PostgreSQL 비밀번호 @required @secret @used=compose,backend',
  'POSTGRES_PASSWORD=hunter2',
  '# @desc API 포트 @required @used=backend',
  `PORT=${study.ports.api}`,
  '# --- project ---',
  '# @desc 기능 플래그 @used=frontend',
  'VITE_FEATURE=on',
].join('\n');
// The form the 8 apps have today: no tags at all.
const legacy = `POSTGRES_DB=study\nPOSTGRES_USER=study\nPOSTGRES_PASSWORD=change-this\nDATABASE_URL=postgres://study:change-this@localhost:55442/study\nPORT=3012\n`;

test('parses tags, sections, and keeps values', () => {
  const entries = parseEnvExample(annotated);
  assert.deepEqual(entries.map((e) => [e.key, e.desc, e.required, e.secret, e.used.join(','), e.section]), [
    ['POSTGRES_DB', 'PostgreSQL DB 이름', true, false, 'compose', 'central'],
    ['POSTGRES_PASSWORD', 'PostgreSQL 비밀번호', true, true, 'compose,backend', 'central'],
    ['PORT', 'API 포트', true, false, 'backend', 'central'],
    ['VITE_FEATURE', '기능 플래그', false, false, 'frontend', 'project'],
  ]);
});

test('untagged files treat passwords, tokens, and DATABASE_URL as secret', () => {
  const secret = Object.fromEntries(parseEnvExample(legacy).map((e) => [e.key, e.secret]));
  assert.deepEqual(secret, { POSTGRES_DB: false, POSTGRES_USER: false, POSTGRES_PASSWORD: true, DATABASE_URL: true, PORT: false });
});

test('cross-checks ports and DB names against the registry', () => {
  assert.deepEqual(envMismatches(parseEnvExample(legacy), study), [
    `PORT 3012 ≠ 레지스트리 api ${study.ports.api}`,
    `DATABASE_URL 포트 55442 ≠ 레지스트리 db ${study.ports.db}`,
  ]);
  assert.deepEqual(envMismatches(parseEnvExample(annotated), study), []);
});

test('repository status covers manifest files, packages, and the sync PR age', () => {
  const manifest = buildManifest({ centralSha: 'c0ffee1', profile: 'app', project: 'study-log', files: [{ path: '.editorconfig', mode: 'full', content: 'root = true\n' }], packages: { '@sirloinbh/tsconfig': '1.0.0' } });
  const repo = { [MANIFEST_PATH]: JSON.stringify(manifest), '.editorconfig': 'root = false\n', 'package.json': JSON.stringify({ devDependencies: { '@sirloinbh/tsconfig': '1.0.0' } }), '.env.example': legacy };
  const pulls = [{ number: 7, html_url: 'https://github.com/sirloinbh/study-log/pull/7', created_at: '2026-10-12T00:00:00Z', head: { ref: 'chore/standards-sync-c0ffee1' } }];
  const status = repoStatus({ target: studyTarget, project: study, read: (p) => repo[p] ?? null, pulls, now: new Date('2026-10-22T00:00:00Z') });
  assert.equal(status.synced, true);
  assert.deepEqual(status.problems, ['.editorconfig: changed']);
  assert.deepEqual(status.packages, [{ name: '@sirloinbh/tsconfig', expected: '1.0.0', actual: '1.0.0', ok: true }]);
  assert.deepEqual(status.syncPr, { number: 7, url: pulls[0].html_url, ageDays: 10 });
  assert.equal(status.envProblems.length, 2);
  const unsynced = repoStatus({ target: studyTarget, project: study, read: () => null });
  assert.equal(unsynced.synced, false);
});

test('packages are also found in workspace package.json files the manifest manages', () => {
  const field = (name) => ({ mode: 'fields', fields: { [`devDependencies.${name}`]: '1.0.0' } });
  const manifest = buildManifest({
    centralSha: 'c0ffee1', profile: 'app', project: 'study-log',
    files: [{ path: 'package.json', ...field('@sirloinbh/eslint-config') }, { path: 'frontend/package.json', ...field('@sirloinbh/tsconfig') }, { path: 'backend/package.json', ...field('@sirloinbh/tsconfig') }],
    packages: { '@sirloinbh/eslint-config': '1.0.0', '@sirloinbh/tsconfig': '1.0.0', '@sirloinbh/design-tokens': '1.0.0' },
  });
  const deps = (d) => JSON.stringify({ devDependencies: d });
  const repo = {
    [MANIFEST_PATH]: JSON.stringify(manifest),
    'package.json': deps({ '@sirloinbh/eslint-config': '1.0.0' }),
    'frontend/package.json': deps({ '@sirloinbh/tsconfig': '1.0.0' }),
    'backend/package.json': deps({ '@sirloinbh/tsconfig': '0.9.0' }),
  };
  const status = repoStatus({ target: studyTarget, project: study, read: (p) => repo[p] ?? null });
  assert.deepEqual(status.packages, [
    { name: '@sirloinbh/eslint-config', expected: '1.0.0', actual: '1.0.0', ok: true },
    // One workspace with the wrong version is reported even if another matches.
    { name: '@sirloinbh/tsconfig', expected: '1.0.0', actual: '0.9.0', ok: false },
    { name: '@sirloinbh/design-tokens', expected: '1.0.0', actual: null, ok: false },
  ]);
  repo['backend/package.json'] = deps({ '@sirloinbh/tsconfig': '1.0.0' });
  const fixed = repoStatus({ target: studyTarget, project: study, read: (p) => repo[p] ?? null });
  assert.equal(fixed.packages.find((p) => p.name === '@sirloinbh/tsconfig').ok, true);
});

test('reports never contain secret values', () => {
  const status = repoStatus({ target: studyTarget, project: study, read: (p) => (p === '.env.example' ? annotated + '\nDATABASE_URL=postgres://u:topsecret@localhost:1/x\n' : null) });
  const { 'docs/compliance.md': compliance, 'docs/env-matrix.md': matrix } = renderReports([status, { repo: 'sirloinbh/x', profile: 'app', unknown: '로컬 클론 없음' }], meta);
  for (const text of [compliance, matrix]) {
    assert.ok(!text.includes('hunter2'));
    assert.ok(!text.includes('topsecret'));
  }
  assert.match(matrix, /\| `POSTGRES_PASSWORD` \| PostgreSQL 비밀번호 \| 예 \| 예 \| \(비밀\) \|/);
  assert.match(matrix, /\| `VITE_FEATURE` \| 기능 플래그 \|  \|  \| `on` \| frontend \| 프로젝트 \|/);
  assert.match(compliance, /\| sirloinbh\/study-log \| 아직 안 됨 \|/);
  assert.match(compliance, /\| sirloinbh\/x \| 확인 못 함 \(로컬 클론 없음\) \|/);
});

test('remote statuses read every target through the API and mark unreachable ones', async () => {
  const repos = { 'sirloinbh/study-log': fakeRepo('sirloinbh/study-log', { '.env.example': legacy, 'package.json': '{}' }) };
  const getClient = async (repo) => {
    if (!repos[repo]) throw new Error('the sync App is not installed');
    return repos[repo].api;
  };
  const statuses = await remoteStatuses({ data, getClient, now: new Date('2026-10-22T00:00:00Z') });
  assert.equal(statuses.length, data.sync.targets.length);
  const s = statuses.find((x) => x.repo === 'sirloinbh/study-log');
  assert.equal(s.synced, false);
  assert.equal(s.env.length, 5);
  assert.equal(statuses.find((x) => x.repo === 'sirloinbh/workout-memo').unknown, 'the sync App is not installed');
});

test('the report PR opens once, then only updates when the content (not the time) changes', async () => {
  const central = fakeRepo('sirloinbh/project-standards', { 'README.md': '# x\n' });
  const status = repoStatus({ target: studyTarget, project: study, read: (p) => (p === '.env.example' ? legacy : null) });
  const first = await publishReports({ api: central.api, reports: renderReports([status], meta), centralSha: 'abcdef1234567' });
  assert.equal(first.status, 'opened');
  assert.deepEqual(first.changed, ['docs/compliance.md', 'docs/env-matrix.md']);
  central.merge('chore/compliance-report');
  const later = renderReports([status], { ...meta, generatedAt: '2026-10-23 00:00 UTC' });
  assert.equal((await publishReports({ api: central.api, reports: later, centralSha: 'abcdef1234567' })).status, 'unchanged');
  assert.equal(withoutStamp(later['docs/compliance.md']), withoutStamp(renderReports([status], meta)['docs/compliance.md']));
});
