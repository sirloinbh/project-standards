// Opens or updates the standards sync PR in one target repository through the GitHub REST API.
// It never clones the target, so no hook or script of the target repository runs.
import crypto from 'node:crypto';
import { checkEntry, MANIFEST_PATH } from './manifest.mjs';
import { pinRanges } from './pin-ranges.mjs';
import { planTarget } from './sync-plan.mjs';
import { loadIndex } from './templates.mjs';

export const BRANCH_PREFIX = 'chore/standards-sync-';
const CENTRAL = 'sirloinbh/project-standards';
// Every commit the sync creates starts with this; any other commit on the branch was added by a person.
const COMMIT_PREFIX = 'chore: 중앙 표준 동기화 (project-standards@';

const renderKeptComment = (centralSha, count) => [
  `Central standards commit \`${centralSha.slice(0, 7)}\` was not applied to this PR, so that the ${count} commit(s) added directly to this PR are not lost.`,
  '',
  '- After merging this PR, run the central repo\'s `sync` workflow; the latest standards will open as a new PR.',
  '- If the added commits are not needed, close this PR and run the same workflow.',
].join('\n');

/** Git blob id of a text, so unchanged files are detected without downloading them. */
export const gitBlobSha = (text) => {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
};

/** package.json files and the lockfiles that record their specs: [pkgPath, [[lockPath, workspaceKey]...]]. */
const PACKAGE_FILES = [
  ['package.json', [['package-lock.json', '']]],
  ['frontend/package.json', [['package-lock.json', 'frontend'], ['frontend/package-lock.json', '']]],
  ['backend/package.json', [['package-lock.json', 'backend'], ['backend/package-lock.json', '']]],
];

// Pins ^/~ ranges in the planned package.json files and keeps every lockfile's specs in sync.
function pinPackageFiles(files, read) {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const notes = [];
  const lockEdits = new Map();
  const lockOf = (p) => {
    if (!lockEdits.has(p)) {
      const text = read(p);
      lockEdits.set(p, text === null ? null : JSON.parse(text));
    }
    return lockEdits.get(p);
  };
  for (const [pkgPath, locks] of PACKAGE_FILES) {
    const planned = byPath.get(pkgPath);
    if (!planned?.content || !locks.length || !lockOf(locks[0][0])) continue;
    const [primary, ...others] = locks;
    const result = pinRanges(JSON.parse(planned.content), lockOf(primary[0]), primary[1]);
    if (!result.changes.length && !result.unresolved.length) continue;
    planned.content = `${JSON.stringify(result.pkg, null, 2)}\n`;
    lockEdits.set(primary[0], result.lock);
    for (const [lockPath, key] of others) {
      const lock = lockOf(lockPath);
      if (!lock) continue;
      for (const change of result.changes) {
        const [, section, name, version] = /^(\w+)\.(.+) \S+ → (\S+)$/.exec(change);
        const installed = lock.packages?.[`node_modules/${name}`]?.version;
        if (installed === version && lock.packages?.[key]?.[section]?.[name] !== undefined) lock.packages[key][section][name] = version;
        else if (installed !== version) result.unresolved.push(`${lockPath}: ${name} is installed as ${installed ?? 'missing'}, not ${version} — regenerate this lockfile`);
      }
    }
    notes.push(...result.changes.map((c) => `${pkgPath}: ${c}`), ...result.unresolved.map((u) => `Needs checking — ${u}`));
  }
  const lockFiles = [...lockEdits]
    .filter(([, lock]) => lock)
    .map(([path, lock]) => ({ path, mode: 'lockfile', source: 'scripts/lib/pin-ranges.mjs', content: `${JSON.stringify(lock, null, 2)}\n` }));
  return { lockFiles, notes };
}

export function renderBody({ target, centralSha, changes, deletions, keptRemoved, pinNotes, packageNotes }) {
  const short = centralSha.slice(0, 7);
  const app = target.profile === 'app';
  const changed = (p) => changes.some((c) => c.path === p);
  const rows = changes.map((c) => `| \`${c.path}\` | ${c.isNew ? 'added' : 'updated'} | ${c.source ? `\`${c.source}\`` : ''} |`);
  rows.push(...deletions.map((p) => `| \`${p}\` | removed | no longer managed centrally |`));
  const confirm = [];
  if (app) confirm.push('- [ ] Merging to main in this repo deploys to production. I checked that now is a good time to deploy');
  if (changes.some((c) => c.mode === 'lockfile' || c.path.endsWith('package.json'))) confirm.push('- [ ] I checked the `package.json` and lockfile changes. If a new `@sirloinbh/*` package was added, regenerate the lockfile with `npm install --ignore-scripts` and commit it to this branch (needs user approval)');
  if (changes.some((c) => c.path.endsWith('.npmrc'))) confirm.push('- [ ] Because of the `${NODE_AUTH_TOKEN}` line in `.npmrc`, npm commands fail without this environment variable. I set it locally and on the server (a token with `read:packages`, or empty if no packages are used)');
  if (changes.some((c) => /^(frontend|backend|database)\//.test(c.path))) confirm.push('- [ ] Files under `frontend/`, `backend/`, or `database/` changed. After merging, run `scripts/push-repositories.ps1` to update the subtree deploy repos');
  if (changed('AGENTS.md')) confirm.push('- [ ] I checked that this project\'s own rules did not disappear from `AGENTS.md`. Move them to `AGENTS.project.md` if needed');
  if (keptRemoved.length) confirm.push(...keptRemoved.map((p) => `- [ ] \`${p}\` is no longer managed centrally but was modified in this repo, so it was not deleted. Delete it yourself if it is not needed`));
  if (!confirm.length) confirm.push('- None');
  const infra = target.profile === 'infra' ? ['', 'This PR does not change `.tf` files and does not trigger terraform apply.'] : [];
  return [
    '## What changed',
    `Syncs ${changes.length + deletions.length} centrally managed files to commit \`${short}\` of the central standards repo \`${CENTRAL}\`.`,
    ...infra,
    '',
    '## Why',
    `- The central repo's main branch changed: https://github.com/${CENTRAL}/commit/${centralSha}`,
    '- The central sync workflow created this PR. To change its content, edit the central repo, not this one.',
    '',
    '## Main changes',
    '| File | Change | Central source |',
    '|---|---|---|',
    ...rows,
    ...(pinNotes.length ? ['', 'Pinned version ranges (to the installed versions, per the lockfile):', ...pinNotes.map((n) => `- ${n}`)] : []),
    ...(packageNotes.length ? ['', 'Shared package provenance check (ADR-0004):', ...packageNotes.map((n) => `- ${n}`)] : []),
    '',
    '## Verification',
    '- Check this repo\'s CI results (including `standards-check`).',
    '',
    '## Check before merging',
    ...confirm,
    '',
    '## Impact',
    app ? '- After merging, the production server may deploy automatically once CI passes.' : '- No effect on infrastructure resources.',
    '',
  ].join('\n');
}

/**
 * Plans and pushes one target. `api` is a GitHub client for the target; `centralApi` reads
 * central releases for package provenance. Returns { status, pr?, changes, deletions }.
 */
export async function syncTarget({ root, data, target, centralSha, workflowSha = centralSha, api, centralApi = null }) {
  const [owner, name] = target.repo.split('/');
  const repoPath = `/repos/${owner}/${name}`;
  const repo = await api('GET', repoPath);
  if (!repo) throw new Error(`${target.repo} not found or not accessible to the App`);
  const baseRef = await api('GET', `${repoPath}/git/ref/heads/${repo.default_branch}`);
  const baseSha = baseRef.object.sha;
  const baseCommit = await api('GET', `${repoPath}/git/commits/${baseSha}`);
  const tree = await api('GET', `${repoPath}/git/trees/${baseCommit.tree.sha}?recursive=1`);
  const blobs = new Map(tree.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));

  const cache = new Map();
  const fetchText = async (path) => {
    if (!cache.has(path)) {
      const sha = blobs.get(path);
      cache.set(path, sha ? Buffer.from((await api('GET', `${repoPath}/git/blobs/${sha}`)).content, 'base64').toString('utf8') : null);
    }
    return cache.get(path);
  };
  // planTarget reads synchronously, so download what it may need first.
  const index = loadIndex(root);
  const needed = [...index.section, ...Object.keys(index.fields[target.profile] ?? {}), MANIFEST_PATH, ...PACKAGE_FILES.flatMap(([, locks]) => locks.map(([p]) => p))];
  await Promise.all(needed.map(fetchText));
  const read = (p) => cache.get(p) ?? null;

  const plan = planTarget({ root, data, target, centralSha, workflowSha, readExisting: read });
  const packageNotes = centralApi ? await verifyPackages(plan.manifest.packages, centralApi) : [];
  const { lockFiles, notes: pinNotes } = target.profile === 'app' ? pinPackageFiles(plan.files, read) : { lockFiles: [], notes: [] };
  const all = [...plan.files, ...lockFiles];

  const changes = all
    .filter((f) => f.content !== undefined && gitBlobSha(f.content) !== blobs.get(f.path))
    .map((f) => ({ path: f.path, mode: f.mode, source: f.source, content: f.content, isNew: !blobs.has(f.path) }));

  // Files the previous sync managed but the central repository no longer does: delete only if untouched.
  const previous = read(MANIFEST_PATH) ? JSON.parse(read(MANIFEST_PATH)) : { files: {} };
  const deletions = [];
  const keptRemoved = [];
  for (const [path, entry] of Object.entries(previous.files ?? {})) {
    if (plan.manifest.files[path] || !blobs.has(path) || entry.mode === 'fields') continue;
    if (checkEntry(entry, await fetchText(path)) === null) deletions.push(path);
    else keptRemoved.push(path);
  }

  // Only the central SHA in the manifest changed: nothing to propose. A manifest that lists other
  // files, packages or registry values is proposed even when every file already matches (#234).
  const meaningful = changes.filter((c) => c.path !== MANIFEST_PATH);
  const withoutSha = (manifest) => JSON.stringify({ ...manifest, centralSha: null });
  const manifestMoved = withoutSha(previous) !== withoutSha(plan.manifest);
  if (!meaningful.length && !deletions.length && !manifestMoved) return { status: 'unchanged', changes: [], deletions: [] };

  const pulls = await api('GET', `${repoPath}/pulls?state=open&per_page=100`);
  const existing = pulls.find((p) => p.head.ref.startsWith(BRANCH_PREFIX) && p.head.repo?.full_name === target.repo);
  // The update below force-pushes and would erase commits a person added to the PR (#367).
  // A listing that fails stops here too, so an unknown branch is never overwritten.
  if (existing) {
    const commits = await api('GET', `${repoPath}/pulls/${existing.number}/commits?per_page=100`);
    const direct = commits.filter((c) => !c.commit.message.startsWith(COMMIT_PREFIX));
    if (direct.length) {
      await api('POST', `${repoPath}/issues/${existing.number}/comments`, { body: renderKeptComment(centralSha, direct.length) });
      return { status: 'kept', pr: existing.html_url, branch: existing.head.ref, changes: [], deletions: [] };
    }
  }

  const newTree = await api('POST', `${repoPath}/git/trees`, {
    base_tree: baseCommit.tree.sha,
    tree: [
      ...changes.map((c) => ({ path: c.path, mode: '100644', type: 'blob', content: c.content })),
      ...deletions.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
    ],
  });
  const short = centralSha.slice(0, 7);
  const commit = await api('POST', `${repoPath}/git/commits`, {
    message: `${COMMIT_PREFIX}${short})\n\n- 왜: 중앙 표준 리포 main이 바뀌었다\n- 변경: 중앙 관리 파일 ${changes.length + deletions.length}개`,
    tree: newTree.sha,
    parents: [baseSha],
  });

  const branch = existing ? existing.head.ref : `${BRANCH_PREFIX}${short}`;
  if (existing || (await api('GET', `${repoPath}/git/ref/heads/${branch}`))) {
    await api('PATCH', `${repoPath}/git/refs/heads/${branch}`, { sha: commit.sha, force: true });
  } else {
    await api('POST', `${repoPath}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
  }
  const title = `${COMMIT_PREFIX}${short})`;
  const body = renderBody({ target, centralSha, changes: meaningful, deletions, keptRemoved, pinNotes, packageNotes });
  const pr = existing
    ? await api('PATCH', `${repoPath}/pulls/${existing.number}`, { title, body })
    : await api('POST', `${repoPath}/pulls`, { title, head: branch, base: repo.default_branch, body });
  return { status: existing ? 'updated' : 'opened', pr: pr.html_url, branch, changes: meaningful, deletions };
}

/** ADR-0004: a shared package version is trusted only if publish.yml released it from a tag. */
export async function verifyPackages(packages, centralApi) {
  const notes = [];
  for (const [pkg, version] of Object.entries(packages ?? {})) {
    if (!version) continue;
    const tag = `${pkg.replace('@sirloinbh/', '')}/v${version}`;
    const release = await centralApi('GET', `/repos/${CENTRAL}/releases/tags/${encodeURIComponent(tag)}`);
    if (!release) throw new Error(`${pkg}@${version}: no release for tag ${tag}; publish it with publish.yml first`);
    const runId = /actions\/runs\/(\d+)/.exec(release.body ?? '')?.[1];
    if (!runId) throw new Error(`${pkg}@${version}: release ${tag} has no publish run link`);
    const run = await centralApi('GET', `/repos/${CENTRAL}/actions/runs/${runId}`);
    if (run?.path !== '.github/workflows/publish.yml' || run?.conclusion !== 'success') throw new Error(`${pkg}@${version}: run ${runId} is not a successful publish.yml run`);
    notes.push(`${pkg}@${version}: tag \`${tag}\`, publish run ${run.html_url} (success)`);
  }
  return notes;
}
