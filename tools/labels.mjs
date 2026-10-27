// Moves app repository issues to the central standard labels (templates/common/labels.json, #277).
//   node tools/labels.mjs plan             read-only: what each open issue would get, as a table
//   node tools/labels.mjs apply [--yes]    adds the planned labels after asking. Old labels stay.
//   --keep-unlabeled <repo,repo>           do not give priority/P3 to issues without a priority there
//   --overrides <file.json>                {"workout-memo#98": "priority/P1"} for issues without a priority
//   --remove-old                           afterwards delete the old labels that have a standard replacement
//                                          (closed issues get the standard labels first)
// Repositories: the sync targets (apps, infrastructure) and EXTRA_REPOS. Other personal
// repositories of the account (study projects and the like) are left alone.
// Only priority labels and two unambiguous types are mapped automatically. An issue with no
// priority label gets priority/P3, as std-backlog says when there is not enough to judge.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

export const OWNER = 'sirloinbh';
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const central = path.resolve(toolDir, '..');

/** Runs gh as sirloinbh. LABELS_GH (a Node script) replaces it in tests. */
function gh(args) {
  const fake = process.env.LABELS_GH;
  const r = fake
    ? spawnSync(process.execPath, [fake, ...args], { encoding: 'utf8' })
    : process.platform === 'win32'
      ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(toolDir, 'gh-project.ps1'), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      : spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`gh를 실행하지 못했습니다: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} 실패 (종료 코드 ${r.status}): ${r.stderr.trim()}`);
  return r.stdout;
}

/** Standard priority for an existing label name, e.g. "P1 높음", "우선순위: P1", "priority:P2". */
export function priorityOf(name) {
  if (/^priority\/P[0-4]$/.test(name)) return name;
  const m = name.match(/(?:^|[\s:：/])P([0-4])(?:$|[\s:])/i) ?? name.match(/^P([0-4])\b/i);
  return m ? `priority/P${m[1]}` : null;
}

const TYPES = { enhancement: 'type/feature', documentation: 'type/docs' };

/** Labels to add to one issue: [{ label, why }]. */
export function planIssue(labels, { defaultP3 = true } = {}) {
  const names = labels.map((l) => (typeof l === 'string' ? l : l.name));
  const add = [];
  const priorities = [...new Set(names.map(priorityOf).filter(Boolean))].sort();
  if (!names.some((n) => /^priority\/P[0-4]$/.test(n))) {
    if (priorities.length) add.push({ label: priorities[0], why: `기존 라벨 ${names.filter((n) => priorityOf(n) === priorities[0]).join(', ')}` });
    else if (defaultP3) add.push({ label: 'priority/P3', why: '우선순위 라벨 없음 (std-backlog: 판단 근거 부족 → P3)' });
  }
  if (!names.some((n) => n.startsWith('type/'))) {
    const type = names.map((n) => TYPES[n]).find(Boolean);
    if (type) add.push({ label: type, why: `기존 라벨 ${names.find((n) => TYPES[n])}` });
  }
  return add;
}

// Part of the portfolio but not in the registry yet.
export const EXTRA_REPOS = ['file-control'];

export function targetRepos(root = central) {
  const sync = JSON.parse(fs.readFileSync(path.join(root, 'sync.config.json'), 'utf8'));
  return new Set([...sync.targets.map((t) => t.repo), ...EXTRA_REPOS.map((r) => `${OWNER}/${r}`)]);
}

export function loadIssues(root = central, { state = 'open' } = {}) {
  if (gh(['api', 'user', '--jq', '.login']).trim() !== OWNER) throw new Error(`GitHub 계정이 ${OWNER}가 아닙니다`);
  // gh search has no "--state all": leaving the flag out returns open and closed issues.
  const stateArgs = state === 'all' ? [] : ['--state', state];
  const raw = gh(['search', 'issues', '--owner', OWNER, ...stateArgs, '--limit', '1000', '--json', 'repository,number,title,labels,state']);
  const repos = targetRepos(root);
  return JSON.parse(raw)
    .map((i) => ({ repo: i.repository.nameWithOwner ?? `${OWNER}/${i.repository.name}`, number: i.number, title: i.title, state: String(i.state ?? 'open').toLowerCase(), labels: i.labels.map((l) => l.name) }))
    .filter((i) => repos.has(i.repo));
}

/** Old labels that have a standard replacement: priority names other than the standard ones, and TYPES. */
export const isOldLabel = (name) => (priorityOf(name) !== null && priorityOf(name) !== name) || name in TYPES;

/**
 * Labels to add per issue. Open issues without any priority get `overrides["repo#number"]`, else
 * priority/P3 unless the repository is in `keepUnlabeled`. Closed issues only get replacements of
 * labels they already have, so deleting the old labels later loses nothing.
 */
export function buildPlan(issues, { keepUnlabeled = [], overrides = {} } = {}) {
  const full = (r) => (r.includes('/') ? r : `${OWNER}/${r}`);
  const keep = new Set(keepUnlabeled.map(full));
  return issues
    .map((i) => {
      const add = planIssue(i.labels, { defaultP3: i.state === 'open' && !keep.has(i.repo) });
      const override = overrides[`${i.repo}#${i.number}`] ?? overrides[`${i.repo.replace(`${OWNER}/`, '')}#${i.number}`];
      if (override && i.state === 'open' && !i.labels.some((n) => priorityOf(n))) {
        const at = add.findIndex((a) => a.label.startsWith('priority/'));
        const item = { label: override, why: '지정값 (overrides)' };
        if (at >= 0) add[at] = item;
        else add.unshift(item);
      }
      return { ...i, add };
    })
    .filter((i) => i.add.length);
}

/** Old label names per repository, from the issues being planned. */
export function oldLabelsByRepo(issues) {
  const byRepo = new Map();
  for (const i of issues) for (const n of i.labels.filter(isOldLabel)) byRepo.set(i.repo, new Set([...(byRepo.get(i.repo) ?? []), n]));
  return byRepo;
}

export function renderPlan(plan, issues, { removeOld = false } = {}) {
  const short = (r) => r.replace(`${OWNER}/`, '');
  const open = issues.filter((i) => i.state === 'open');
  const byRepo = new Map();
  for (const i of open) byRepo.set(i.repo, (byRepo.get(i.repo) ?? 0) + 1);
  const lines = ['| 리포 | 열린 이슈 | 라벨을 더할 열린 이슈 | 더할 라벨 (이슈 수) | 근거 없음 → P3 |', '|---|---|---|---|---|'];
  for (const [repo, total] of [...byRepo].sort()) {
    const items = plan.filter((p) => p.repo === repo && p.state === 'open');
    const counts = new Map();
    for (const p of items) for (const a of p.add) counts.set(a.label, (counts.get(a.label) ?? 0) + 1);
    const p3 = items.filter((p) => p.add.some((a) => a.why.startsWith('우선순위 라벨 없음'))).map((p) => `#${p.number}`);
    lines.push(`| ${short(repo)} | ${total} | ${items.length} | ${[...counts].sort().map(([l, n]) => `\`${l}\` ${n}`).join(', ')} | ${p3.join(' ') || '없음'} |`);
  }
  const closed = plan.filter((p) => p.state !== 'open').length;
  if (closed) lines.push('', `닫힌 이슈 ${closed}개에도 기존 라벨에 대응하는 표준 라벨을 더합니다.`);
  const mapping = new Map();
  for (const i of issues) for (const n of i.labels.filter(isOldLabel)) mapping.set(n, priorityOf(n) ?? TYPES[n]);
  lines.push('', '| 기존 라벨 | 표준 라벨 |', '|---|---|');
  for (const [from, to] of [...mapping].sort()) lines.push(`| ${from} | \`${to}\` |`);
  if (removeOld) {
    lines.push('', '지울 기존 라벨 (표준 라벨을 모두 더한 리포에서만):');
    for (const [repo, names] of [...oldLabelsByRepo(issues)].sort()) lines.push(`- ${short(repo)}: ${[...names].sort().join(', ')}`);
  }
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

export async function run(argv, { log = console.log, ask = confirm, root = central } = {}) {
  const [command, ...rest] = argv;
  if (!['plan', 'apply'].includes(command)) throw new Error('사용법: node tools/labels.mjs plan | apply [--yes] [--keep-unlabeled <리포,리포>] [--overrides <파일>] [--remove-old]');
  const opt = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const keepUnlabeled = (opt('keep-unlabeled') ?? '').split(',').filter(Boolean);
  const overrides = opt('overrides') ? JSON.parse(fs.readFileSync(opt('overrides'), 'utf8')) : {};
  const removeOld = rest.includes('--remove-old');
  // Deleting a label also takes it off closed issues, so those are included before deleting.
  const issues = loadIssues(root, { state: removeOld ? 'all' : 'open' });
  const plan = buildPlan(issues, { keepUnlabeled, overrides });
  log(renderPlan(plan, issues, { removeOld }));
  if (command === 'plan') return 0;
  const question = `이슈 ${plan.length}개에 라벨을 더할까요?${removeOld ? ' 그 뒤 기존 라벨을 지웁니다' : ' 기존 라벨은 지우지 않습니다'} (y/N) `;
  if (!rest.includes('--yes') && !(await ask(question))) {
    log('바꾸지 않았습니다.');
    return 1;
  }
  // Standard labels must exist first; repositories outside the sync targets may not have them.
  const { labels } = JSON.parse(fs.readFileSync(path.join(root, 'templates/common/labels.json'), 'utf8'));
  const needed = new Set(plan.flatMap((p) => p.add.map((a) => a.label)));
  for (const repo of new Set(plan.map((p) => p.repo))) {
    for (const l of labels.filter((x) => needed.has(x.name))) gh(['label', 'create', l.name, '--repo', repo, '--color', l.color, '--description', l.description, '--force']);
  }
  const failedRepos = new Set();
  for (const p of plan) {
    try {
      gh(['issue', 'edit', String(p.number), '--repo', p.repo, ...p.add.flatMap((a) => ['--add-label', a.label])]);
    } catch (error) {
      failedRepos.add(p.repo);
      log(`실패: ${p.repo}#${p.number} — ${error.message}`);
    }
  }
  log(`라벨을 더한 이슈 ${plan.length - plan.filter((p) => failedRepos.has(p.repo)).length}개 이상, 실패한 리포 ${failedRepos.size}개`);
  if (removeOld) {
    for (const [repo, names] of oldLabelsByRepo(issues)) {
      if (failedRepos.has(repo)) {
        log(`${repo}: 라벨 추가에 실패한 이슈가 있어 기존 라벨을 지우지 않음`);
        continue;
      }
      for (const name of names) {
        try {
          gh(['label', 'delete', name, '--repo', repo, '--yes']);
          log(`지움: ${repo} ${name}`);
        } catch (error) {
          failedRepos.add(repo);
          log(`지우기 실패: ${repo} ${name} — ${error.message}`);
        }
      }
    }
  }
  return failedRepos.size ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`labels: ${error.message}`);
      process.exit(2);
    },
  );
}
