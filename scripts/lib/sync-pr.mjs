// Opens or updates the standards sync PR in one target repository through the GitHub REST API.
// It never clones the target, so no hook or script of the target repository runs.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mapLimit } from './github-app.mjs';
import { checkEntry, MANIFEST_PATH } from './manifest.mjs';
import { ADOPTION_RULES } from '../standards-check.mjs';
import { planTarget } from './sync-plan.mjs';
import { loadIndex } from './templates.mjs';

export const BRANCH_PREFIX = 'chore/standards-sync-';
const CENTRAL = 'sirloinbh/project-standards';
// Every commit the sync creates starts with this; any other commit on the branch was added by a person.
const COMMIT_PREFIX = 'chore: sync central standards (project-standards@';
const isBotCommit = (message) => message.startsWith(COMMIT_PREFIX);

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

const MAX_CENTRAL_CHANGES = 15;

/**
 * The central PRs merged after `fromSha` up to `toSha`, oldest first: [{ number, title }] (#904). A commit that is not
 * a merge commit of a PR is listed by its subject with number null. Returns null when git cannot tell (no history,
 * an unknown commit), so the PR body simply leaves the section out.
 */
export function centralChanges(root, fromSha, toSha) {
  const log = spawnSync('git', ['-C', root, 'log', '--first-parent', '--reverse', '--format=%s%x1f%b%x1e', `${fromSha}..${toSha}`], { encoding: 'utf8' });
  if (log.status !== 0) return null;
  return log.stdout
    .split('\x1e')
    .map((record) => record.replace(/^\n/, ''))
    .filter(Boolean)
    .map((record) => {
      const [subject, body = ''] = record.split('\x1f');
      const number = subject.match(/^Merge pull request #(\d+) from /)?.[1];
      const title = body.split('\n').find((line) => line.trim()) ?? subject;
      return { number: number ? Number(number) : null, title: title.trim() };
    });
}

/**
 * The lines for the changed managed files that have an adoption rule (#910): the helper arrives in a managed file,
 * but the repo-owned file that must call it is the app's to change. Same rule list as standards-check (#906).
 */
export function adoptionNotes(changes) {
  const paths = new Set(changes.map((c) => c.path));
  return ADOPTION_RULES.filter((rule) => paths.has(rule.managedFile)).map(
    (rule) => `- \`${rule.managedFile}\` changed: \`${rule.helper}\` must be used by the repo-owned \`${rule.ownedFile}\`. \`standards-check\` warns when it is not.`,
  );
}

/** The `## Why` lines for the central PRs this sync carries (#904); nothing when the list is unknown or empty. */
function renderCarried(carried, previousSha) {
  if (!carried?.length) return [];
  const shown = carried.slice(0, MAX_CENTRAL_CHANGES);
  const line = (c) => `  - ${c.number ? `\`project-standards#${c.number}\` ` : ''}${c.title}`;
  const more = carried.length - shown.length;
  return [`- Central changes since the last sync (\`${previousSha.slice(0, 7)}\`), oldest first:`, ...shown.map(line), ...(more > 0 ? [`  - and ${more} more`] : [])];
}

export function renderBody({ target, centralSha, changes, deletions, keptRemoved, packageNotes, previousSha = null, centralChanges: carried = null }) {
  const short = centralSha.slice(0, 7);
  const app = target.profile === 'app';
  const changed = (p) => changes.some((c) => c.path === p);
  const rows = changes.map((c) => `| \`${c.path}\` | ${c.isNew ? 'added' : 'updated'} | ${c.source ? `\`${c.source}\`` : ''} |`);
  rows.push(...deletions.map((p) => `| \`${p}\` | removed | no longer managed centrally |`));
  const confirm = [];
  if (app) confirm.push('- [ ] Merging to main in this repo deploys to production. I checked that now is a good time to deploy');
  if (changes.some((c) => c.path.endsWith('package.json'))) confirm.push('- [ ] I checked the `package.json` and lockfile changes. If a new `@sirloinbh/*` package was added, regenerate the lockfile with `npm install --ignore-scripts` and commit it to this branch (needs user approval)');
  if (changes.some((c) => c.path.endsWith('.npmrc'))) confirm.push('- [ ] Because of the `${NODE_AUTH_TOKEN}` line in `.npmrc`, npm commands fail without this environment variable. I set it locally and on the server (a token with `read:packages`, or empty if no packages are used)');
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
    ...renderCarried(carried, previousSha),
    '',
    '## Main changes',
    '| File | Change | Central source |',
    '|---|---|---|',
    ...rows,
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
    ...adoptionNotes(changes),
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
  const needed = [...index.section, ...Object.keys(index.fields[target.profile] ?? {}), MANIFEST_PATH];
  await mapLimit(needed, fetchText);
  const read = (p) => cache.get(p) ?? null;

  const plan = planTarget({ root, data, target, centralSha, workflowSha, readExisting: read });
  const packageNotes = centralApi ? await verifyPackages(plan.manifest.packages, centralApi) : [];

  const changes = plan.files
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
    const direct = commits.filter((c) => !isBotCommit(c.commit.message));
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
    message: `${COMMIT_PREFIX}${short})\n\n- Why: the central standards repo main changed\n- Changes: ${changes.length + deletions.length} managed files`,
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
  const previousSha = previous.centralSha && previous.centralSha !== centralSha ? previous.centralSha : null;
  const carried = previousSha ? centralChanges(root, previousSha, centralSha) : null;
  const body = renderBody({ target, centralSha, changes: meaningful, deletions, keptRemoved, packageNotes, previousSha, centralChanges: carried });
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
