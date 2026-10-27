import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { renderReports } from '../compliance.mjs';
import { repoStatus } from '../lib/compliance.mjs';
import { loadAll } from '../lib/registry.mjs';
import { collectSettings, evaluateSettings } from '../lib/repo-settings.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const { data } = loadAll(root);
const target = data.sync.targets.find((t) => t.project === 'workout-memo');
const meta = { generatedAt: '2026-10-22 00:00 UTC', centralSha: 'abcdef1234567' };
const VALUE = 'variable-value-must-not-appear';

/** Fake GitHub API for the settings endpoints. `routes` maps a path suffix to a response, or an Error to throw. */
function fakeApi(repo, routes) {
  const calls = [];
  const api = async (method, p) => {
    calls.push(`${method} ${p}`);
    const key = p.replace(`/repos/${repo}`, '') || '/';
    if (!(key in routes)) throw new Error(`no route ${key}`);
    const value = routes[key];
    if (value instanceof Error) throw value;
    return value;
  };
  return { api, calls };
}

const PLAN = new Error('GitHub API GET /x failed: 403 Upgrade to GitHub Pro or make this repository public to enable this feature.');

// What study-log returned on 2026-10-22 (private repository on GitHub Free).
const privateRepo = {
  '/': { visibility: 'private', default_branch: 'main', allow_merge_commit: true, allow_squash_merge: true, allow_rebase_merge: true, delete_branch_on_merge: false, security_and_analysis: null },
  '/actions/permissions/workflow': { default_workflow_permissions: 'read', can_approve_pull_request_reviews: false },
  '/branches/main/protection': PLAN,
  '/vulnerability-alerts': null,
  '/automated-security-fixes': { enabled: false, paused: false },
  '/actions/secrets?per_page=100': { total_count: 0, secrets: [] },
  '/actions/variables?per_page=30': { total_count: 1, variables: [{ name: 'DEPLOY_HOST', value: VALUE }] },
};

// A public repository that meets the standard.
const goodPublic = {
  '/': {
    visibility: 'public',
    default_branch: 'main',
    allow_merge_commit: true,
    allow_squash_merge: false,
    allow_rebase_merge: false,
    delete_branch_on_merge: true,
    security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } },
  },
  '/actions/permissions/workflow': { default_workflow_permissions: 'read', can_approve_pull_request_reviews: false },
  '/branches/main/protection': { required_status_checks: { checks: [{ context: 'ci / verify' }] }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } },
  '/vulnerability-alerts': '',
  '/automated-security-fixes': { enabled: true, paused: false },
  '/actions/secrets?per_page=100': { total_count: 1, secrets: [{ name: 'DEPLOY_KEY', created_at: '2026-10-01' }] },
  '/actions/variables?per_page=30': { total_count: 0, variables: [] },
  '/code-scanning/default-setup': { state: 'configured', languages: ['javascript-typescript'], query_suite: 'default' },
};

const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));

test('a public repository that meets the standard passes every item', async () => {
  const { api } = fakeApi('sirloinbh/good', goodPublic);
  const rows = evaluateSettings(await collectSettings(api, 'sirloinbh/good'), { secrets: ['DEPLOY_KEY'] });
  assert.deepEqual(rows.filter((r) => r.status !== 'ok'), []);
  assert.equal(byId(rows)['branch-protection'].actual, '필수 검사 ci / verify');
});

test('a private repository on GitHub Free marks protection and secret scanning as plan limits, not failures', async () => {
  const { api } = fakeApi('sirloinbh/study-log', privateRepo);
  const rows = byId(evaluateSettings(await collectSettings(api, 'sirloinbh/study-log')));
  assert.equal(rows['branch-protection'].status, 'plan');
  assert.equal(rows['secret-scanning'].status, 'plan');
  assert.equal(rows['push-protection'].status, 'plan');
  assert.equal(rows['code-scanning'].status, 'plan');
  assert.equal(rows['vulnerability-alerts'].status, 'fail');
  assert.equal(rows['security-fixes'].status, 'fail');
  assert.equal(rows['squash-merge'].status, 'warn');
  assert.equal(rows['delete-branch'].status, 'warn');
  assert.equal(rows['workflow-permissions'].status, 'ok');
  assert.equal(rows.variables.status, 'warn');
  assert.equal(rows.variables.actual, '목록에 없는 이름: DEPLOY_HOST');
});

test('missing protection on a public repository, missing secrets and unreadable endpoints are reported', async () => {
  const routes = { ...goodPublic, '/branches/main/protection': null, '/actions/secrets?per_page=100': new Error('GitHub API GET failed: 403 Resource not accessible by integration') };
  const { api } = fakeApi('sirloinbh/x', routes);
  const rows = byId(evaluateSettings(await collectSettings(api, 'sirloinbh/x'), { secrets: ['NODE_AUTH_TOKEN'] }));
  assert.equal(rows['branch-protection'].status, 'fail');
  assert.equal(rows['branch-protection'].actual, '없음');
  assert.equal(rows.secrets.status, 'unknown');
  const weak = byId(evaluateSettings(await collectSettings(fakeApi('sirloinbh/y', { ...goodPublic, '/branches/main/protection': { required_status_checks: null, allow_force_pushes: { enabled: true }, allow_deletions: { enabled: false } } }).api, 'sirloinbh/y')));
  assert.equal(weak['branch-protection'].actual, '필수 검사 없음, 강제 push 허용');
  const missing = byId(evaluateSettings(await collectSettings(fakeApi('sirloinbh/z', goodPublic).api, 'sirloinbh/z'), { secrets: ['DEPLOY_KEY', 'NODE_AUTH_TOKEN'] }));
  assert.equal(missing.secrets.status, 'fail');
  assert.equal(missing.secrets.actual, '없음: NODE_AUTH_TOKEN');
});

test('CodeQL default setup must be configured on a public repository; an unreadable endpoint is unknown', async () => {
  const off = byId(evaluateSettings(await collectSettings(fakeApi('sirloinbh/a', { ...goodPublic, '/code-scanning/default-setup': { state: 'not-configured' } }).api, 'sirloinbh/a')));
  assert.equal(off['code-scanning'].status, 'fail');
  assert.equal(off['code-scanning'].actual, 'not-configured');
  const denied = new Error('GitHub API GET failed: 403 Resource not accessible by integration');
  const unknown = byId(evaluateSettings(await collectSettings(fakeApi('sirloinbh/b', { ...goodPublic, '/code-scanning/default-setup': denied }).api, 'sirloinbh/b')));
  assert.equal(unknown['code-scanning'].status, 'unknown');
});

test('only names are collected: variable values are dropped and never reach the reports', async () => {
  const { api } = fakeApi('sirloinbh/workout-memo', privateRepo);
  const facts = await collectSettings(api, 'sirloinbh/workout-memo');
  assert.deepEqual(facts.variables, ['DEPLOY_HOST']);
  assert.ok(!JSON.stringify(facts).includes(VALUE));
  const status = repoStatus({ target, project: data.projects.projects.find((p) => p.name === 'workout-memo'), read: () => null });
  status.settings = evaluateSettings(facts, target);
  const reports = renderReports([status], meta);
  for (const text of Object.values(reports)) assert.ok(!text.includes(VALUE));
  const compliance = reports['docs/compliance.md'];
  assert.match(compliance, /\| sirloinbh\/workout-memo \| 아직 안 됨 \|.*\| ✗ 2 △ 4 \|$/m);
  assert.match(compliance, /## 리포 설정/);
  assert.match(compliance, /\| — 요금제 \| main 브랜치 보호 \| 비공개 리포라 Free 요금제에서 쓸 수 없음 \| 켬 \|/);
  assert.match(compliance, /\| △ 권장 \| Actions variable 이름 \| 목록에 없는 이름: DEPLOY_HOST \| 없음 \|/);
});

test('every sync target can list expected secret and variable names (schema)', () => {
  for (const t of data.sync.targets) {
    for (const key of ['secrets', 'variables']) if (t[key]) assert.ok(t[key].every((n) => /^[A-Z_][A-Z0-9_]*$/.test(n)), `${t.repo} ${key}`);
  }
});
