import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createAppJwt, createClient, getInstallationToken } from '../lib/github-app.mjs';
import { MANIFEST_PATH } from '../lib/manifest.mjs';
import { loadAll } from '../lib/registry.mjs';
import { adoptionNotes, centralChanges, gitBlobSha, renderBody, syncTarget, verifyPackages } from '../lib/sync-pr.mjs';
import { apply } from '../sync.mjs';
import { fakePublishedCentral, fakeRepo } from './fake-github.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const studyTarget = data.sync.targets.find((t) => t.project === 'study-log');
const infraTarget = data.sync.targets.find((t) => t.profile === 'infra');
const SHA1 = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const SHA2 = 'b2c3d4e5f60718293a4b5c6d7e8f901234567890';

// A study-log-like repository: a project line in .gitignore, exact versions, root and subtree lockfiles.
function studyRepo() {
  const lock = { name: 'study-log', lockfileVersion: 3, packages: { '': { devDependencies: { concurrently: '9.2.1' } }, frontend: { dependencies: { recharts: '3.10.1' } }, 'node_modules/concurrently': { version: '9.2.1' }, 'node_modules/recharts': { version: '3.10.1' } } };
  const frontendLock = { name: 'frontend', lockfileVersion: 3, packages: { '': { dependencies: { recharts: '3.10.1' } }, 'node_modules/recharts': { version: '3.10.1' } } };
  return fakeRepo('sirloinbh/study-log', {
    '.gitignore': 'node_modules/\n.env\nmy-project-only/\n',
    'package.json': JSON.stringify({ name: 'study-log', devDependencies: { concurrently: '9.2.1' } }, null, 2),
    'frontend/package.json': JSON.stringify({ name: 'frontend', dependencies: { recharts: '3.10.1' } }, null, 2),
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

test('a first sync opens a PR with the rendered files and the manifest', async () => {
  const repo = studyRepo();
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  assert.equal(result.status, 'opened');
  assert.equal(result.branch, 'chore/standards-sync-a1b2c3d');
  const files = repo.filesAt(result.branch);
  assert.ok(files['AGENTS.md'].includes('# Study Log Project Instructions'));
  assert.equal(JSON.parse(files[MANIFEST_PATH]).centralSha, SHA1);
  assert.match(files['.gitignore'], /# --- project ---\nmy-project-only\/\n$/, 'project-only lines move below the marker');
  assert.equal(JSON.parse(files['package.json']).devDependencies.concurrently, data.versions.dependencies.root.devDependencies.concurrently, 'a common dependency is set to the central pin (#704)');
  assert.equal(JSON.parse(files['package.json']).engines.node, '24.21.0');
  assert.equal(JSON.parse(files['frontend/package.json']).dependencies.recharts, '3.10.1');
  assert.equal(files['package-lock.json'], repo.filesAt('main')['package-lock.json'], 'lockfiles are never edited by the sync');
  assert.equal(files['src/app.ts'], 'export {};\n', 'project code is untouched');
  assert.equal(repo.refs.get('heads/main'), [...repo.commits.keys()][0], 'main is never pushed to');
  const pr = repo.pulls[0];
  assert.equal(pr.title, 'chore: sync central standards (project-standards@a1b2c3d)');
  for (const heading of ['## What changed', '## Why', '## Main changes', '## Verification', '## Check before merging', '## Impact']) assert.ok(pr.body.includes(heading), heading);
  assert.match(pr.body, /Merging to main in this repo deploys to production/);
  assert.match(pr.body, /NODE_AUTH_TOKEN/);
  assert.ok(!pr.body.includes('Pinned version ranges'));
});

test('a later central commit updates the same open PR instead of opening another', async () => {
  const repo = studyRepo();
  await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, api: repo.api });
  assert.equal(result.status, 'updated');
  assert.equal(result.branch, 'chore/standards-sync-a1b2c3d', 'the branch keeps the first SHA');
  assert.equal(repo.pulls.length, 1);
  assert.equal(repo.pulls[0].title, 'chore: sync central standards (project-standards@b2c3d4e)');
  assert.ok(repo.calls.includes('PATCH /repos/sirloinbh/study-log/git/refs/heads/chore/standards-sync-a1b2c3d'));
  assert.equal(JSON.parse(repo.filesAt(result.branch)[MANIFEST_PATH]).centralSha, SHA2);
});

test('a central commit leaves a sync branch with a direct commit untouched and says so on the PR (#367)', async () => {
  const repo = studyRepo();
  const { branch } = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  const direct = repo.addCommit(branch, 'chore: 시각 기준선 갱신 (#184)');
  const before = repo.calls.length;
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, api: repo.api });
  assert.equal(result.status, 'kept');
  assert.equal(result.branch, branch);
  assert.equal(result.pr, repo.pulls[0].html_url);
  assert.equal(repo.refs.get(`heads/${branch}`), direct, 'the direct commit is still the head');
  const calls = repo.calls.slice(before);
  for (const write of ['PATCH', 'POST /repos/sirloinbh/study-log/git']) assert.equal(calls.some((c) => c.startsWith(write)), false, write);
  assert.equal(repo.pulls[0].title, 'chore: sync central standards (project-standards@a1b2c3d)');
  assert.equal(repo.pulls[0].comments.length, 1);
  assert.match(repo.pulls[0].comments[0], /`b2c3d4e`.*the 1 commit\(s\) added directly/);
  assert.match(repo.pulls[0].comments[0], /`sync` workflow/);
});

test('a sync branch whose commits cannot be listed is not overwritten (#367)', async () => {
  const repo = studyRepo();
  const { branch } = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  const head = repo.refs.get(`heads/${branch}`);
  const api = (method, path, body) => (path.includes('/commits?per_page=100') ? Promise.resolve(null) : repo.api(method, path, body));
  await assert.rejects(syncTarget({ root, data, target: studyTarget, centralSha: SHA2, api }));
  assert.equal(repo.refs.get(`heads/${branch}`), head);
});

test('after a PR with a direct commit is merged, the next central commit opens a new PR (#367)', async () => {
  const repo = studyRepo();
  const { branch } = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  repo.addCommit(branch, 'chore: 시각 기준선 갱신 (#184)');
  repo.merge(branch);
  const result = await syncTarget({ root, data, target: studyTarget, centralSha: SHA2, api: repo.api });
  assert.notEqual(result.status, 'kept');
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

// #234: workout-memo#160 added the common UI files before the registry turned features.ui on,
// so every file already matched and only the manifest's file list grew.
test('a manifest that lists new managed files is proposed even when every file already matches', async () => {
  const withUi = structuredClone(data);
  withUi.projects.projects.find((p) => p.name === 'study-log').features.ui = true;
  const synced = async (d) => {
    const repo = studyRepo();
    const result = await syncTarget({ root, data: d, target: studyTarget, centralSha: SHA1, workflowSha: SHA1, api: repo.api });
    repo.merge(result.branch);
    return repo.filesAt('main');
  };
  const withoutUi = structuredClone(data);
  withoutUi.projects.projects.find((p) => p.name === 'study-log').features.ui = false;
  const before = await synced(withoutUi);
  const app = await synced(withUi);
  // The app holds the UI files, but its manifest is still the one from before features.ui.
  const repo = fakeRepo('sirloinbh/study-log', { ...app, [MANIFEST_PATH]: before[MANIFEST_PATH] });
  const result = await syncTarget({ root, data: withUi, target: studyTarget, centralSha: SHA1, workflowSha: SHA1, api: repo.api });
  assert.equal(result.status, 'opened');
  assert.deepEqual(result.changes, [], 'only the manifest is committed');
  const manifest = JSON.parse(repo.filesAt(result.branch)[MANIFEST_PATH]);
  assert.ok(manifest.files['frontend/src/components/ui/button.tsx'], 'the UI files are now managed');
  // A newer central commit alone still proposes nothing.
  repo.merge(result.branch);
  const again = await syncTarget({ root, data: withUi, target: studyTarget, centralSha: SHA2, workflowSha: SHA1, api: repo.api });
  assert.equal(again.status, 'unchanged');
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
  assert.match(repo.pulls.at(-1).body, /`old\/edited\.txt` is no longer managed centrally/);
});

test('the infra PR states that it does not touch .tf files or run apply', async () => {
  const repo = fakeRepo('sirloinbh/shared-aws-infrastructure', { 'main.tf': 'terraform {}\n', '.gitignore': '*.tfstate\n' });
  const result = await syncTarget({ root, data, target: infraTarget, centralSha: SHA1, api: repo.api });
  assert.equal(result.status, 'opened');
  assert.equal(repo.filesAt(result.branch)['main.tf'], 'terraform {}\n');
  assert.match(repo.pulls[0].body, /does not change `\.tf` files and does not trigger terraform apply/);
  assert.doesNotMatch(repo.pulls[0].body, /deploys to production/);
});

test('shared package versions are trusted only with a successful publish.yml release', async () => {
  const run = { path: '.github/workflows/publish.yml', conclusion: 'success', html_url: 'https://github.com/sirloinbh/project-standards/actions/runs/7' };
  const central = (release, runInfo = run) => async (method, p) => (p.includes('/releases/tags/') ? release : runInfo);
  const release = { body: '- 배포 실행: https://github.com/sirloinbh/project-standards/actions/runs/7' };
  assert.deepEqual(await verifyPackages({ '@sirloinbh/tsconfig': '1.0.0', '@sirloinbh/design-tokens': null }, central(release)), [
    '@sirloinbh/tsconfig@1.0.0: tag `tsconfig/v1.0.0`, publish run https://github.com/sirloinbh/project-standards/actions/runs/7 (success)',
  ]);
  await assert.rejects(verifyPackages({ '@sirloinbh/tsconfig': '1.0.0' }, central(null)), /no release for tag tsconfig\/v1\.0\.0/);
  await assert.rejects(verifyPackages({ '@sirloinbh/tsconfig': '1.0.0' }, central({ body: 'no link' })), /no publish run link/);
  await assert.rejects(verifyPackages({ '@sirloinbh/tsconfig': '1.0.0' }, central(release, { ...run, path: '.github/workflows/other.yml' })), /not a successful publish\.yml run/);
});

test('design-tokens is verified against the design-system release and run', async () => {
  const seen = [];
  const run = { path: '.github/workflows/publish.yml', conclusion: 'success', html_url: 'https://github.com/sirloinbh/design-system/actions/runs/9' };
  const api = async (method, p) => { seen.push(p); return p.includes('/releases/tags/') ? { body: '- Deploy run: https://github.com/sirloinbh/design-system/actions/runs/9' } : run; };
  assert.deepEqual(await verifyPackages({ '@sirloinbh/design-tokens': '1.1.1' }, api), [
    '@sirloinbh/design-tokens@1.1.1: tag `design-tokens/v1.1.1`, publish run https://github.com/sirloinbh/design-system/actions/runs/9 (success)',
  ]);
  assert.deepEqual(seen, ['/repos/sirloinbh/design-system/releases/tags/design-tokens%2Fv1.1.1', '/repos/sirloinbh/design-system/actions/runs/9']);
  await assert.rejects(verifyPackages({ '@sirloinbh/design-tokens': '1.1.1' }, async () => null), /in sirloinbh\/design-system/);
});

test('apply only checks the token while every target is disabled, then syncs enabled targets', async () => {
  const tokens = [];
  const logs = [];
  const getToken = async (repo) => {
    tokens.push(repo);
    return 'token';
  };
  const off = structuredClone(data);
  for (const t of off.sync.targets) t.enabled = false;
  assert.deepEqual(await apply({ data: off, targets: off.sync.targets, centralSha: SHA1, getToken, makeClient: () => null, log: (l) => logs.push(l) }), []);
  assert.deepEqual(tokens, ['sirloinbh/project-standards']);
  assert.match(logs[0], /Installation token issued\. Every target is disabled/);

  const rolled = structuredClone(data);
  for (const t of rolled.sync.targets) t.enabled = t.project === 'workout-memo';
  const repos = { 'sirloinbh/workout-memo': fakeRepo('sirloinbh/workout-memo', { 'package.json': '{"name":"workout-memo"}' }) };
  const central = fakePublishedCentral();
  const results = await apply({ data: rolled, targets: rolled.sync.targets, centralSha: SHA1, getToken: async (r) => r, makeClient: (r) => repos[r]?.api ?? central, log: () => {} });
  assert.deepEqual(results.map((r) => `${r.target} ${r.status}`), ['sirloinbh/workout-memo opened']);
});

test('apply reads the central repo with centralToken, not an App token (#205)', async () => {
  const rolled = structuredClone(data);
  for (const t of rolled.sync.targets) t.enabled = t.project === 'workout-memo';
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

test('a GET answered 204 with no body is told apart from a 404 (#226)', async () => {
  const api = createClient({ token: 't', fetchImpl: async (url) => new Response(null, { status: url.endsWith('/on') ? 204 : 404 }) });
  assert.equal(await api('GET', '/on'), '', 'vulnerability-alerts answers 204 when enabled');
  assert.equal(await api('GET', '/off'), null);
});

// #904: the PR body names the central PRs it carries, read from the first-parent history of the central checkout.
function temporaryHistory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'central-history-'));
  const git = (...args) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(dir, 'a.txt'), '0\n');
  git('add', '.');
  git('commit', '-q', '-m', 'start');
  const start = git('rev-parse', 'HEAD');
  const merge = (number, title) => {
    git('switch', '-q', '-c', `work-${number}`);
    fs.writeFileSync(path.join(dir, 'a.txt'), `${number}\n`);
    git('commit', '-q', '-am', `wip ${number}`);
    git('switch', '-q', 'main');
    git('merge', '-q', '--no-ff', '-m', `Merge pull request #${number} from owner/work-${number}`, '-m', title, `work-${number}`);
  };
  merge(11, 'feat: first change (#1)');
  merge(12, 'fix: second change (#2)');
  fs.writeFileSync(path.join(dir, 'b.txt'), 'direct\n');
  git('add', '.');
  git('commit', '-q', '-m', 'chore: a direct commit on main');
  return { dir, start, head: git('rev-parse', 'HEAD') };
}

test('centralChanges lists the merged central PRs oldest first, direct commits by subject, and null when git cannot tell', (t) => {
  const { dir, start, head } = temporaryHistory();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(centralChanges(dir, start, head), [
    { number: 11, title: 'feat: first change (#1)' },
    { number: 12, title: 'fix: second change (#2)' },
    { number: null, title: 'chore: a direct commit on main' },
  ]);
  assert.deepEqual(centralChanges(dir, head, head), []);
  assert.equal(centralChanges(dir, 'f'.repeat(40), head), null, 'an unknown commit gives no list');
  assert.equal(centralChanges(path.join(dir, 'missing'), start, head), null, 'a folder that is not a repository gives no list');
});

test('the sync PR body lists the carried central changes, at most 15, and leaves the section out without them', () => {
  const base = { target: studyTarget, centralSha: SHA2, changes: [], deletions: [], keptRemoved: [], packageNotes: [] };
  const carried = Array.from({ length: 17 }, (_, i) => ({ number: 100 + i, title: `change ${i}` }));
  const body = renderBody({ ...base, previousSha: SHA1, centralChanges: [...carried, { number: null, title: 'direct' }].slice(0, 17) });
  assert.match(body, /- Central changes since the last sync \(`a1b2c3d`\), oldest first:\n {2}- `project-standards#100` change 0\n/);
  assert.equal(body.match(/`project-standards#\d+`/g).length, 15);
  assert.match(body, / {2}- and 2 more\n/);
  assert.ok(body.indexOf('Central changes since') < body.indexOf('## Main changes'), 'the list sits under Why');
  assert.match(renderBody({ ...base, previousSha: SHA1, centralChanges: [{ number: null, title: 'direct' }] }), / {2}- direct\n/);
  for (const centralChanges of [null, []]) assert.doesNotMatch(renderBody({ ...base, previousSha: SHA1, centralChanges }), /Central changes since/);
});

test('a first sync PR has no central changes section: there is no earlier synced commit to compare with (#904)', async () => {
  const repo = studyRepo();
  const first = await syncTarget({ root, data, target: studyTarget, centralSha: SHA1, api: repo.api });
  assert.equal(first.status, 'opened');
  assert.doesNotMatch(repo.pulls[0].body, /Central changes since/);
});

// #910: a changed managed file with an adoption rule (#906) is named in the PR body with the repo-owned file to adopt it in.
test('adoptionNotes names the helper and the repo-owned file for each changed managed file with a rule', () => {
  const change = (p) => ({ path: p, isNew: false, source: 'x' });
  assert.deepEqual(adoptionNotes([change('backend/src/standard/auth.ts')]), ['- `backend/src/standard/auth.ts` changed: `listenHost` must be used by the repo-owned `backend/src/server.ts`. `standards-check` warns when it is not.']);
  const all = adoptionNotes([change('backend/src/standard/db.ts'), change('backend/src/standard/tools.ts'), change('backend/src/standard/auth.ts'), change('README.md')]);
  // db.ts has two rules (createPool and setInt8Parser, #1035).
  assert.equal(all.length, 4);
  assert.match(all.join('\n'), /`setInt8Parser` must be used by the repo-owned/);
  assert.match(adoptionNotes([change('backend/src/standard/rate-limit.ts')]).join('\n'), /`apiRateLimit` must be used by the repo-owned `backend\/src\/app\.ts`/);
  assert.match(all.join('\n'), /`createPool` must be used by the repo-owned `backend\/src\/server\.ts, pool\.ts or db\.ts/);
  assert.match(all.join('\n'), /`registerToolRoutes` must be used by the repo-owned `backend\/src\/app\.ts, backend\/src\/server\.ts`/);
  assert.deepEqual(adoptionNotes([change('backend/src/standard/http.ts'), change('deploy/autodeploy.sh')]), []);
  assert.deepEqual(adoptionNotes([]), []);
});

test('the sync PR body puts the adoption notes under Impact, and has none for other files', () => {
  const base = { target: studyTarget, centralSha: SHA2, deletions: [], keptRemoved: [], packageNotes: [] };
  const withAuth = renderBody({ ...base, changes: [{ path: 'backend/src/standard/auth.ts', isNew: false, source: 'x' }] });
  assert.match(withAuth, /## Impact\n- After merging[^\n]*\n- `backend\/src\/standard\/auth\.ts` changed: `listenHost` must be used by the repo-owned `backend\/src\/server\.ts`/);
  assert.doesNotMatch(renderBody({ ...base, changes: [{ path: 'deploy/autodeploy.sh', isNew: false, source: 'x' }] }), /must be used by the repo-owned/);
});
