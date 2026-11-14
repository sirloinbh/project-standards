// Gathers the open issues of the portfolio repositories on one GitHub Projects board (#279).
//   node tools/project-board.mjs plan [--project <number>]          read-only: what would change
//   node tools/project-board.mjs sync [--project <number>] [--yes]  adds the missing issues and
//                                                                   sets Priority, after asking
// Repositories: the same as tools/labels.mjs (sync targets and EXTRA_REPOS). Priority comes from
// the standard label priority/P0..P4 and goes to the board's single-select field "Priority", whose
// options must contain P0..P4. The tool never creates or changes fields; it says what is missing.
// Issues that are closed or already on the board are not removed. Needs the gh "project" scope.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { OWNER, targetRepos } from './labels.mjs';

export const DEFAULT_PROJECT = 5;
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const central = path.resolve(toolDir, '..');

/** Runs gh as sirloinbh. BOARD_GH (a Node script) replaces it in tests. */
function gh(args) {
  const fake = process.env.BOARD_GH;
  const r = fake
    ? spawnSync(process.execPath, [fake, ...args], { encoding: 'utf8' })
    : process.platform === 'win32'
      ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(toolDir, 'gh-project.ps1'), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      : spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`could not run gh: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed (exit code ${r.status}): ${r.stderr.trim()}`);
  return r.stdout;
}

const priorityLabel = (labels) => labels.filter((l) => /^priority\/P[0-4]$/.test(l)).sort()[0] ?? null;

/** The "Priority" single-select field and its option id per label, or a reason it cannot be used. */
export function priorityField(fields) {
  const field = fields.find((f) => f.name.toLowerCase() === 'priority');
  if (!field) return { problem: 'the board has no "Priority" field' };
  if (!field.options) return { problem: 'the board field "Priority" is not a single select' };
  const options = {};
  for (let n = 0; n <= 4; n++) {
    const option = field.options.find((o) => new RegExp(`(^|\\W)P${n}(\\W|$)`, 'i').test(o.name));
    if (option) options[`priority/P${n}`] = option;
  }
  const missing = [0, 1, 2, 3, 4].filter((n) => !options[`priority/P${n}`]).map((n) => `P${n}`);
  if (missing.length) return { problem: `the "Priority" field has no option for ${missing.join(', ')}` };
  return { field, options };
}

/**
 * What to do: issues to add, and board items (existing or new) whose Priority must change.
 * `items` are board items: { id, content: { repository, number }, priority }.
 */
export function buildPlan(issues, items, options) {
  const onBoard = new Map(items.filter((i) => i.content?.number).map((i) => [`${i.content.repository}#${i.content.number}`, i]));
  const add = [];
  const set = [];
  for (const issue of issues) {
    const item = onBoard.get(`${issue.repo}#${issue.number}`);
    const label = priorityLabel(issue.labels);
    const option = label && options ? options[label] : null;
    if (!item) add.push({ ...issue, option });
    else if (option && item.priority !== option.name) set.push({ ...issue, itemId: item.id, option });
  }
  return { add, set };
}

export function renderPlan({ add, set }, issues) {
  const short = (r) => r.replace(`${OWNER}/`, '');
  const repos = [...new Set(issues.map((i) => i.repo))].sort();
  const lines = ['| Repo | Open issues | To add | Priority to set |', '|---|---|---|---|'];
  for (const repo of repos) {
    const count = (list) => list.filter((i) => i.repo === repo).length;
    lines.push(`| ${short(repo)} | ${count(issues)} | ${count(add)} | ${count(add.filter((i) => i.option)) + count(set)} |`);
  }
  const noPriority = add.filter((i) => !i.option).map((i) => `${short(i.repo)}#${i.number}`);
  if (noPriority.length) lines.push('', `Added without Priority (no priority/P0..P4 label): ${noPriority.join(' ')}`);
  return lines.join('\n');
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^(y|yes|예|네)$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

const FIELD_HELP = 'On the board, open the field menu (+ at the right of the table header) → New field → name "Priority", type Single select, options P0, P1, P2, P3, P4 → Save. Then run this again.';

export async function run(argv, { log = console.log, ask = confirm, root = central } = {}) {
  const [command, ...rest] = argv;
  if (!['plan', 'sync'].includes(command)) throw new Error('Usage: node tools/project-board.mjs plan | sync [--project <number>] [--yes]');
  const at = rest.indexOf('--project');
  const project = at >= 0 ? Number(rest[at + 1]) : DEFAULT_PROJECT;
  if (!Number.isInteger(project) || project < 1) throw new Error('--project needs the board number from its URL');

  if (gh(['api', 'user', '--jq', '.login']).trim() !== OWNER) throw new Error(`the GitHub account is not ${OWNER}`);
  const board = JSON.parse(gh(['project', 'view', String(project), '--owner', OWNER, '--format', 'json']));
  const { fields } = JSON.parse(gh(['project', 'field-list', String(project), '--owner', OWNER, '--format', 'json']));
  const priority = priorityField(fields);
  if (priority.problem) {
    log(`${board.title} (#${project}): ${priority.problem}. ${FIELD_HELP}`);
    return 1;
  }
  const { items } = JSON.parse(gh(['project', 'item-list', String(project), '--owner', OWNER, '--format', 'json', '--limit', '3000']));
  const repos = targetRepos(root);
  const issues = JSON.parse(gh(['search', 'issues', '--owner', OWNER, '--state', 'open', '--limit', '1000', '--json', 'repository,number,title,labels,url']))
    .map((i) => ({ repo: i.repository.nameWithOwner ?? `${OWNER}/${i.repository.name}`, number: i.number, title: i.title, url: i.url, labels: i.labels.map((l) => l.name) }))
    .filter((i) => repos.has(i.repo));
  const plan = buildPlan(issues, items, priority.options);
  log(`${board.title} (#${project}): ${items.length} items on the board`);
  log(renderPlan(plan, issues));
  if (command === 'plan') return 0;
  if (!plan.add.length && !plan.set.length) {
    log('Nothing to change.');
    return 0;
  }
  if (!rest.includes('--yes') && !(await ask(`Add ${plan.add.length} issues and set Priority on ${plan.set.length + plan.add.filter((i) => i.option).length}? (y/N) `))) {
    log('No changes made.');
    return 1;
  }
  const setPriority = (itemId, option) =>
    gh(['project', 'item-edit', '--id', itemId, '--project-id', board.id, '--field-id', priority.field.id, '--single-select-option-id', option.id]);
  let failed = 0;
  let added = 0;
  let set = 0;
  for (const issue of plan.add) {
    try {
      const item = JSON.parse(gh(['project', 'item-add', String(project), '--owner', OWNER, '--url', issue.url, '--format', 'json']));
      added++;
      if (issue.option) {
        setPriority(item.id, issue.option);
        set++;
      }
    } catch (error) {
      failed++;
      log(`Failed: ${issue.repo}#${issue.number} — ${error.message}`);
    }
  }
  for (const issue of plan.set) {
    try {
      setPriority(issue.itemId, issue.option);
      set++;
    } catch (error) {
      failed++;
      log(`Failed: ${issue.repo}#${issue.number} — ${error.message}`);
    }
  }
  log(`Added ${added}, Priority set on ${set}, failed ${failed}`);
  return failed ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`project-board: ${error.message}`);
      process.exit(2);
    },
  );
}
