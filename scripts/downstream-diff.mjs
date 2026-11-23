// Shows which files each downstream repo would receive, change or lose if a central PR merged (#1056).
// Usage (ci.yml, pull requests from this repo only):
//   node scripts/downstream-diff.mjs --base <base-checkout> --head <head-checkout> --work <folder> --out <comment.md>
//   ... --post <owner/repo>#<pr>   (needs GITHUB_TOKEN with pull-requests: write)
// It runs `sync.mjs --dry-run` of each checkout with the same fixed commit id, so the commit id and the pinned CI
// workflow commit never show up as a difference, and compares the two result folders per repo.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from './lib/github-app.mjs';

export const MARKER = '<!-- downstream-diff -->';
export const FIXED_SHA = '0'.repeat(40);
const MAX_LISTED = 8;

const listFiles = (dir) => {
  const out = [];
  const visit = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) visit(full);
      else out.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  };
  if (fs.existsSync(dir)) visit(dir);
  return out;
};

/** Compares two dry-run result folders: [{ repo, added, changed, removed }] for every repo that differs, sorted by repo. */
export function compareOutputs(baseDir, headDir) {
  const repos = new Set([...fs.readdirSync(baseDir, { withFileTypes: true }), ...fs.readdirSync(headDir, { withFileTypes: true })].filter((e) => e.isDirectory()).map((e) => e.name));
  const diffs = [];
  for (const repo of [...repos].sort()) {
    const base = new Map(listFiles(path.join(baseDir, repo)).map((f) => [f, fs.readFileSync(path.join(baseDir, repo, f), 'utf8')]));
    const head = new Map(listFiles(path.join(headDir, repo)).map((f) => [f, fs.readFileSync(path.join(headDir, repo, f), 'utf8')]));
    const added = [...head.keys()].filter((f) => !base.has(f)).sort();
    const removed = [...base.keys()].filter((f) => !head.has(f)).sort();
    const changed = [...head.keys()].filter((f) => base.has(f) && base.get(f) !== head.get(f)).sort();
    if (added.length || removed.length || changed.length) diffs.push({ repo, added, changed, removed });
  }
  return diffs;
}

const list = (label, files) => {
  if (!files.length) return [];
  const shown = files.slice(0, MAX_LISTED).map((f) => `\`${f}\``).join(', ');
  const more = files.length > MAX_LISTED ? `, and ${files.length - MAX_LISTED} more` : '';
  return [`${label}: ${shown}${more}`];
};

/** The comment text, or null when nothing downstream changes. */
export function renderComment(diffs) {
  if (!diffs.length) return null;
  const rows = diffs.map((d) => `| ${d.repo} | ${d.added.length} | ${d.changed.length} | ${d.removed.length} |`);
  const details = diffs.map((d) => [`**${d.repo}**`, ...[...list('added', d.added), ...list('changed', d.changed), ...list('no longer managed', d.removed)].map((l) => `- ${l}`)].join('\n'));
  return [
    MARKER,
    '## Downstream effect of this PR',
    `If this PR merges, the sync will change files in ${diffs.length} downstream repo(s).`,
    '',
    '| Repo | Added | Changed | No longer managed |',
    '|---|---|---|---|',
    ...rows,
    '',
    '<details><summary>Files per repo</summary>',
    '',
    details.join('\n\n'),
    '',
    '</details>',
    '',
    'A removed file is deleted downstream only if nobody edited it there. Comes from `scripts/downstream-diff.mjs`; it updates on each push.',
  ].join('\n');
}

/** Creates the comment, updates the earlier one in place, or deletes it when nothing downstream changes any more. */
export async function postComment({ api, repo, pr, body }) {
  const comments = (await api('GET', `/repos/${repo}/issues/${pr}/comments?per_page=100`)) ?? [];
  const mine = comments.find((c) => c.body?.startsWith(MARKER));
  if (!body) {
    if (mine) await api('DELETE', `/repos/${repo}/issues/comments/${mine.id}`);
    return mine ? 'deleted' : 'none';
  }
  if (mine) {
    if (mine.body === body) return 'unchanged';
    await api('PATCH', `/repos/${repo}/issues/comments/${mine.id}`, { body });
    return 'updated';
  }
  await api('POST', `/repos/${repo}/issues/${pr}/comments`, { body });
  return 'created';
}

function preview(checkout, out) {
  fs.rmSync(out, { recursive: true, force: true });
  execFileSync('node', [path.join(checkout, 'scripts/sync.mjs'), '--dry-run', '--out', out, '--sha', FIXED_SHA], { cwd: checkout, stdio: ['ignore', 'ignore', 'inherit'] });
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const args = {};
    for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
    for (const k of ['base', 'head', 'work']) if (!args[k]) throw new Error(`--${k} is required`);
    const work = path.resolve(args.work);
    preview(path.resolve(args.base), path.join(work, 'base'));
    preview(path.resolve(args.head), path.join(work, 'head'));
    const body = renderComment(compareOutputs(path.join(work, 'base'), path.join(work, 'head')));
    if (args.out) fs.writeFileSync(args.out, body ?? '');
    console.log(body ?? 'No downstream file changes.');
    if (args.post) {
      const [repo, pr] = args.post.split('#');
      if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is missing');
      console.log(`comment: ${await postComment({ api: createClient({ token: process.env.GITHUB_TOKEN }), repo, pr, body })}`);
    }
  } catch (error) {
    console.error(`downstream-diff: ${error.message}`);
    process.exit(1);
  }
}
