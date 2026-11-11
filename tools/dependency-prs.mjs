// Open Dependabot PRs across every sirloinbh repository, grouped by package and version (#268).
//   node tools/dependency-prs.mjs list
//   node tools/dependency-prs.mjs close --package <name> [--to <version>] [--repo <name>] [--reason <text>] [--yes]
// `close` lists the matching PRs and asks before closing them with a comment. Nothing is merged:
// merging an app PR deploys it, so that stays with the user.
// GitHub is reached only as sirloinbh, through tools/gh-project.ps1 on Windows.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

export const OWNER = 'sirloinbh';
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REASON = `Dependency updates are handled centrally in one place (${OWNER}/project-standards#268). The same update is covered by the grouped security update PR or by central sync.`;

/** Runs gh as sirloinbh. DEPENDENCY_PRS_GH (a Node script) replaces it in tests. */
export function gh(args) {
  const fake = process.env.DEPENDENCY_PRS_GH;
  const r = fake
    ? spawnSync(process.execPath, [fake, ...args], { encoding: 'utf8' })
    : process.platform === 'win32'
      ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(toolDir, 'gh-project.ps1'), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      : spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`could not run gh: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed (exit code ${r.status}): ${r.stderr.trim()}`);
  return r.stdout;
}

const major = (version) => Number(String(version).replace(/^v/, '').split('.')[0]);

/** Reads a Dependabot PR title. Grouped PRs have no single package. */
export function parseTitle(title) {
  const single = title.match(/Bump (\S+) from (\S+) to (\S+?)(?: in (\S+))?$/);
  if (single) {
    const [, pkg, from, to, directory = '/'] = single;
    return { package: pkg, from, to, directory, kind: Number.isFinite(major(from)) && major(to) > major(from) ? 'major' : 'minor/patch' };
  }
  const group = title.match(/Bump the (\S+) group/);
  if (group) return { package: `(group) ${group[1]}`, from: '', to: '', directory: '', kind: group[1].includes('major') ? 'major' : 'group' };
  return { package: `(unknown) ${title}`, from: '', to: '', directory: '', kind: '?' };
}

export function loadPrs() {
  if (gh(['api', 'user', '--jq', '.login']).trim() !== OWNER) throw new Error(`the GitHub account is not ${OWNER}. Check the tools/gh-project.ps1 setup`);
  const raw = gh(['search', 'prs', '--owner', OWNER, '--state', 'open', '--author', 'app/dependabot', '--limit', '200', '--json', 'repository,number,title,url,createdAt']);
  return JSON.parse(raw).map((pr) => ({ repo: pr.repository.nameWithOwner ?? `${OWNER}/${pr.repository.name}`, number: pr.number, title: pr.title, url: pr.url, ...parseTitle(pr.title) }));
}

/** Groups PRs by package and target version, most widespread first. */
export function groupPrs(prs) {
  const groups = new Map();
  for (const pr of prs) {
    const key = `${pr.package}@${pr.to}`;
    if (!groups.has(key)) groups.set(key, { package: pr.package, from: new Set(), to: pr.to, kind: pr.kind, prs: [] });
    const g = groups.get(key);
    if (pr.from) g.from.add(pr.from);
    g.prs.push(pr);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, from: [...g.from].sort(), repos: new Set(g.prs.map((p) => p.repo)).size }))
    .sort((a, b) => b.prs.length - a.prs.length || a.package.localeCompare(b.package));
}

export function renderTable(groups) {
  if (!groups.length) return 'No open Dependabot PRs.';
  const short = (repo) => repo.replace(`${OWNER}/`, '');
  const lines = ['| Package | Change | Kind | Repo | PR |', '|---|---|---|---|---|'];
  for (const g of groups) {
    const change = g.to ? `${g.from.join(', ')} → ${g.to}` : '';
    const prs = g.prs.map((p) => `${short(p.repo)}#${p.number}${p.directory && p.directory !== '/' ? ` (${p.directory})` : ''}`).join(', ');
    lines.push(`| \`${g.package}\` | ${change} | ${g.kind} | ${g.repos} | ${prs} |`);
  }
  const total = groups.reduce((n, g) => n + g.prs.length, 0);
  lines.push('', `${total} open PRs, ${groups.length} kinds of updates`);
  return lines.join('\n');
}

export function selectPrs(prs, { package: pkg, to, repo }) {
  return prs.filter((p) => p.package === pkg && (!to || p.to === to) && (!repo || p.repo === repo || p.repo === `${OWNER}/${repo}`));
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^(y|yes|예|네)$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

export async function run(argv, { log = console.log, ask = confirm } = {}) {
  const [command, ...rest] = argv;
  const opt = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  if (command === 'list') {
    log(renderTable(groupPrs(loadPrs())));
    return 0;
  }
  if (command !== 'close') throw new Error('Usage: node tools/dependency-prs.mjs list | close --package <name> [--to <version>] [--repo <repo>] [--reason <reason>] [--yes]');
  const pkg = opt('package');
  if (!pkg) throw new Error('close needs --package');
  const targets = selectPrs(loadPrs(), { package: pkg, to: opt('to'), repo: opt('repo') });
  if (!targets.length) {
    log('No open PRs match.');
    return 0;
  }
  log(`${targets.length} PRs to close (they are not merged):`);
  for (const p of targets) log(`  ${p.repo}#${p.number} ${p.title}`);
  if (!rest.includes('--yes') && !(await ask('Close them? (y/N) '))) {
    log('Nothing closed.');
    return 1;
  }
  const reason = opt('reason') ?? DEFAULT_REASON;
  let failed = 0;
  for (const p of targets) {
    try {
      gh(['pr', 'close', String(p.number), '--repo', p.repo, '--comment', reason]);
      log(`  Closed: ${p.repo}#${p.number}`);
    } catch (error) {
      failed++;
      log(`  Failed: ${p.repo}#${p.number} — ${error.message}`);
    }
  }
  return failed ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`dependency-prs: ${error.message}`);
      process.exit(2);
    },
  );
}
