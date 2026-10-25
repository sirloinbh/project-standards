import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createAppJwt, createClient, getInstallationToken } from '../lib/github-app.mjs';
import { MANIFEST_PATH } from '../lib/manifest.mjs';
import { pinRanges } from '../lib/pin-ranges.mjs';
import { loadAll } from '../lib/registry.mjs';
import { gitBlobSha, syncTarget, verifyPackages } from '../lib/sync-pr.mjs';
import { apply } from '../sync.mjs';
import { fakePublishedCentral, fakeRepo } from './fake-github.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const studyTarget = data.sync.targets.find((t) => t.project === 'study-log');
const infraTarget = data.sync.targets.find((t) => t.profile === 'infra');
const SHA1 = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const SHA2 = 'b2c3d4e5f60718293a4b5c6d7e8f901234567890';

// A study-log-like repository: a project line in .gitignore, ^ ranges, root and subtree lockfiles.
function studyRepo() {
  const lock = { name: 'study-log', lockfileVersion: 3, packages: { '': { devDependencies: { concurrently: '^9.2.0' } }, frontend: { dependencies: { react: '^19.1.0' } }, 'node_modules/concurrently': { version: '9.2.1' }, 'node_modules/react': { version: '19.1.1' } } };
  const frontendLock = { name: 'frontend', lockfileVersion: 3, packages: { '': { dependencies: { react: '^19.1.0' } }, 'node_modules/react': { version: '19.1.1' } } };
  return fakeRepo('sirloinbh/study-log', {
    '.gitignore': 'node_modules/\n.env\nmy-project-only/\n',
    'package.json': JSON.stringify({ name: 'study-log', devDependencies: { concurrently: '^9.2.0' } }, null, 2),
    'frontend/package.json': JSON.stringify({ name: 'frontend', dependencies: { react: '^19.1.0' } }, null, 2),
    'backend/package.json': JSON.stringify({ name: 'backend' }, null, 2),
    'package-lock.json': JSON.stringify(lock, null, 2),
    'frontend/package-lock.json': JSON.stringify(frontendLock, null, 2),
    'src/app.ts': 'export {};\n',
  });
}

test('git blob ids match git for known content', () => {
  assert.equal(gitBlobSha(''), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.equal(gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

test('pinRanges uses the installed version and updates the lockfile spec', () => {
  const lock = { packages: { '': { devDependencies: { vite: '^6.3.5', exact: '1.0.0' } }, 'node_modules/vite': { version: '6.3.6' } } };
  const result = pinRanges({ devDependencies: { vite: '^6.3.5', exact: '1.0.0', gone: '~2.0.0' } }, lock, '');
  assert.deepEqual(result.pkg.devDependencies, { vite: '6.3.6', exact: '1.0.0', gone: '~2.0.0' });
  assert.equal(result.lock.packages[''].devDependencies.vite, '6.3.6');
  assert.deepEqual(result.changes, ['devDependencies.vite ^6.3.5 → 6.3.6']);
  assert.deepEqual(result.unresolved, ['devDependencies.gone ~2.0.0 (not found in lockfile)']);
});

test('a first sync opens a PR with the rendered files, pinned versions, and the manifest', async () => {
  const repo = studyRepo();
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  assert.equal(result.status, 'opened');
  assert.equal(result.branch, 'chore/standards-sync-a1b2c3d');
  const files = repo.filesAt(result.branch);
  assert.ok(files['AGENTS.md'].includes('# 공부 기록 프로젝트 지침'));
  assert.equal(JSON.parse(files[MANIFEST_PATH]).centralSha, SHA1);
  assert.match(files['.gitignore'], /# --- project ---\nmy-project-only\/\n$/, 'project-only lines move below the marker');
  assert.equal(JSON.parse(files['package.json']).devDependencies.concurrently, '9.2.1');
  assert.equal(JSON.parse(files['package.json']).engines.node, '24.21.0');
  assert.equal(JSON.parse(files['frontend/package.json']).dependencies.react, '19.1.1');
  assert.equal(JSON.parse(files['package-lock.json']).packages.frontend.dependencies.react, '19.1.1');
  assert.equal(JSON.parse(files['frontend/package-lock.json']).packages[''].dependencies.react, '19.1.1');
  assert.equal(files['src/app.ts'], 'export {};\n', 'project code is untouched');
  assert.equal(repo.refs.get('heads/main'), [...repo.commits.keys()][0], 'main is never pushed to');
  const pr = repo.pulls[0];
  assert.equal(pr.title, 'chore: 중앙 표준 동기화 (project-standards@a1b2c3d)');
  for (const heading of ['## 무엇을 바꿨나요', '## 왜 바꿨나요', '## 주요 변경', '## 확인한 내용', '## 병합 전에 확인해 주세요', '## 영향 범위']) assert.ok(pr.body.includes(heading), heading);
  assert.match(pr.body, /main 병합은 곧 운영 배포/);
  assert.match(pr.body, /NODE_AUTH_TOKEN/);
  assert.match(pr.body, /devDependencies\.concurrently \^9\.2\.0 → 9\.2\.1/);
});

test('a later central commit updates the same open PR instead of opening another', async () => {
  const repo = studyRepo();
  await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, api: repo.api });
  assert.equal(result.status, 'updated');
  assert.equal(result.branch, 'chore/standards-sync-a1b2c3d', 'the branch keeps the first SHA');
  assert.equal(repo.pulls.length, 1);
  assert.equal(repo.pulls[0].title, 'chore: 중앙 표준 동기화 (project-standards@b2c3d4e)');
  assert.ok(repo.calls.includes('PATCH /repos/sirloinbh/study-log/git/refs/heads/chore/standards-sync-a1b2c3d'));
  assert.equal(JSON.parse(repo.filesAt(result.branch)[MANIFEST_PATH]).centralSha, SHA2);
});

test('after the PR is merged, a central commit that changes no synced file proposes nothing', async () => {
  const repo = studyRepo();
  const first = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, workflowSha: SHA1, api: repo.api });
  repo.merge(first.branch);
  // SHA2 is a newer central commit that did not touch the reusable workflows, so ci.yml keeps SHA1.
  const again = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, workflowSha: SHA1, api: repo.api });
  assert.equal(again.status, 'unchanged');
  assert.equal(repo.pulls.filter((p) => p.state === 'open').length, 0);
  // A change to the reusable workflow does reach the repository.
  const third = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, workflowSha: SHA2, api: repo.api });
  assert.equal(third.status, 'opened');
  assert.deepEqual(third.changes.map((c) => c.path), ['.github/workflows/ci.yml'], 'the manifest is committed too but not listed as a change');
  assert.equal(JSON.parse(repo.filesAt(third.branch)[MANIFEST_PATH]).centralSha, SHA2);
});

test('files dropped from the standard are deleted only if untouched', async () => {
  const repo = studyRepo();
  const first = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  repo.merge(first.branch);
  // Pretend an older standard also managed two files that the central repository no longer has.
  const files = repo.filesAt('main');
  const manifest = JSON.parse(files[MANIFEST_PATH]);
  manifest.files['old/untouched.txt'] = { mode: 'full', sha256: crypto.createHash('sha256').update('old\n').digest('hex') };
  manifest.files['old/edited.txt'] = { mode: 'full', sha256: crypto.createHash('sha256').update('old\n').digest('hex') };
  const commit = await repo.api('POST', '/repos/sirloinbh/study-log/git/trees', {
    base_tree: repo.commits.get(repo.refs.get('heads/main')).tree,
    tree: [
      { path: MANIFEST_PATH, content: JSON.stringify(manifest) },
      { path: 'old/untouched.txt', content: 'old\n' },
      { path: 'old/edited.txt', content: 'changed by the project\n' },
    ],
  });
  const c = await repo.api('POST', '/repos/sirloinbh/study-log/git/commits', { tree: commit.sha, parents: [repo.refs.get('heads/main')] });
  repo.refs.set('heads/main', c.sha);
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, api: repo.api });
  assert.deepEqual(result.deletions, ['old/untouched.txt']);
  const after = repo.filesAt(result.branch);
  assert.equal(after['old/untouched.txt'], undefined);
  assert.equal(after['old/edited.txt'], 'changed by the project\n');
  assert.match(repo.pulls.at(-1).body, /`old\/edited\.txt`는 중앙 관리에서 빠졌지만/);
});

test('the infra PR states that it does not touch .tf files or run apply', async () => {
  const repo = fakeRepo('sirloinbh/shared-aws-infrastructure', { 'main.tf': 'terraform {}\n', '.gitignore': '*.tfstate\n' });
  const result = await syncTarget({ root, data, target: infraTarget, centralSha: SHA1, api: repo.api });
  assert.equal(result.status, 'opened');
  assert.equal(repo.filesAt(result.branch)['main.tf'], 'terraform {}\n');
  assert.match(repo.pulls[0].body, /`\.tf` 파일을 바꾸지 않으며 terraform apply를 일으키지 않습니다/);
  assert.doesNotMatch(repo.pulls[0].body, /운영 배포/);
});

test('shared package versions are trusted only with a successful publish.yml release', async () => {
  const run = { path: '.github/workflows/publish.yml', conclusion: 'success', html_url: 'https://github.com/sirloinbh/project-standards/actions/runs/7' };
  const central = (release, runInfo = run) => async (method, p) => (p.includes('/releases/tags/') ? release : runInfo);
  const release = { body: '- 배포 실행: https://github.com/sirloinbh/project-standards/actions/runs/7' };
  assert.deepEqual(await verifyPackages({ '@sirloinbh/tsconfig': '1.0.0', '@sirloinbh/design-tokens': null }, central(release)), [
    '@sirloinbh/tsconfig@1.0.0: 태그 `tsconfig/v1.0.0`, 배포 실행 https://github.com/sirloinbh/project-standards/actions/runs/7 (성공)',
  ]);
  await assert.rejects(verifyPackages({ '@sirloinbh/tsconfig': '1.0.0' }, central(null)), /no release for tag tsconfig\/v1\.0\.0/);
  await assert.rejects(verifyPackages({ '@sirloinbh/tsconfig': '1.0.0' }, central({ body: 'no link' })), /no publish run link/);
  await assert.rejects(verifyPackages({ '@sirloinbh/tsconfig': '1.0.0' }, central(release, { ...run, path: '.github/workflows/other.yml' })), /not a successful publish\.yml run/);
});

test('apply only checks the token while maxRollout is 0, then syncs targets in rollout', async () => {
  const tokens = [];
  const logs = [];
  const getToken = async (repo) => {
    tokens.push(repo);
    return 'token';
  };
  const off = structuredClone(data);
  off.sync.maxRollout = 0;
  assert.deepEqual(await apply({ data: off, targets: off.sync.targets, centralSha: SHA1, getToken, makeClient: () => null, log: (l) => logs.push(l) }), []);
  assert.deepEqual(tokens, ['sirloinbh/project-standards']);
  assert.match(logs[0], /설치 토큰 발급 확인\. maxRollout 0/);

  const rolled = structuredClone(data);
  rolled.sync.maxRollout = 1;
  const repos = { 'sirloinbh/workout-memo': fakeRepo('sirloinbh/workout-memo', { 'package.json': '{"name":"workout-memo"}' }) };
  const central = fakePublishedCentral();
  const results = await apply({ data: rolled, targets: rolled.sync.targets, centralSha: SHA1, getToken: async (r) => r, makeClient: (r) => repos[r]?.api ?? central, log: () => {} });
  assert.deepEqual(results.map((r) => `${r.target} ${r.status}`), ['sirloinbh/workout-memo opened']);
});

test('apply reads the central repo with centralToken, not an App token (#205)', async () => {
  const rolled = structuredClone(data);
  rolled.sync.maxRollout = 1;
  const tokens = [];
  const clients = [];
  const repos = { 'sirloinbh/workout-memo': fakeRepo('sirloinbh/workout-memo', { 'package.json': '{"name":"workout-memo"}' }) };
  const central = fakePublishedCentral();
  const results = await apply({
    data: rolled,
    targets: rolled.sync.targets,
    centralSha: SHA1,
    getToken: async (r) => (tokens.push(r), r),
    makeClient: (token) => (clients.push(token), token === 'workflow-token' ? central : repos[token].api),
    centralToken: 'workflow-token',
    log: () => {},
  });
  assert.deepEqual(results.map((r) => r.status), ['opened']);
  assert.deepEqual(tokens, ['sirloinbh/workout-memo'], 'App tokens are issued only for target repositories');
  assert.equal(clients[0], 'workflow-token');
});

test('the App JWT is RS256-signed with the App ID and a short lifetime', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const jwt = createAppJwt({ appId: 12345, privateKey, now: 1_000_000 });
  const [h, p, s] = jwt.split('.');
  const decode = (x) => JSON.parse(Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.deepEqual(decode(h), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(decode(p), { iat: 999_940, exp: 1_000_540, iss: '12345' });
  assert.ok(crypto.createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')));
  assert.throws(() => createAppJwt({ appId: 1, privateKey: 'not a key' }), /not a PEM private key/);
});

test('the installation token is limited to the one target repository and errors hide the token', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/repos/sirloinbh/study-log/installation')) return new Response(JSON.stringify({ id: 99 }), { status: 200 });
    return new Response(JSON.stringify({ token: 'ghs_secret', expires_at: '2026-10-22T04:00:00Z' }), { status: 201 });
  };
  const { token } = await getInstallationToken({ appId: 1, privateKey, repo: 'sirloinbh/study-log', fetchImpl });
  assert.equal(token, 'ghs_secret');
  assert.equal(requests[1].url, 'https://api.github.com/app/installations/99/access_tokens');
  assert.deepEqual(JSON.parse(requests[1].init.body), { repositories: ['study-log'] });
  assert.match(requests[0].init.headers.Authorization, /^Bearer ey/);

  const failing = createClient({ token: 'ghs_secret', fetchImpl: async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 }) });
  await assert.rejects(failing('POST', '/x', {}), (error) => error.message === 'GitHub API POST /x failed: 401 Bad credentials' && !error.message.includes('ghs_secret'));
});
