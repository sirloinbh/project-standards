// Operations columns of the compliance report (#1057): last CI result on main, open security alerts,
// last merge to main (the deploy time proxy) and the age of the oldest open PR, plus the daily trend history.
// Every value is read separately; a value the token cannot read is null and shows as "?".

const DAY_MS = 86_400_000;
const ALERT_CAP = 100;
// PRs that are kept open on purpose are not "stale" (for example develop-skill#29).
const HOLD_PR = /do[ -]?not[ -]?merge/i;

const safe = async (fn) => {
  try {
    return await fn();
  } catch {
    return null;
  }
};

/** Result of the newest completed workflow run on the default branch: { conclusion, at } or null. */
export async function lastMainCi(api, repo, branch = 'main') {
  const runs = await api('GET', `/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&status=completed&per_page=1`);
  const run = runs?.workflow_runs?.[0];
  return run ? { conclusion: run.conclusion, at: run.updated_at ?? run.created_at } : runs ? { conclusion: 'none', at: null } : null;
}

/** Number of open alerts (capped at ALERT_CAP per page: `{ count, more }`) or null when unreadable. */
async function countAlerts(api, path) {
  const alerts = await api('GET', `${path}?state=open&per_page=${ALERT_CAP}`);
  return Array.isArray(alerts) ? { count: alerts.length, more: alerts.length === ALERT_CAP } : null;
}

/** Commit time of the head of main: the merge time of the commit that autodeploy ships. */
export async function lastMainMerge(api, repo, branch = 'main') {
  const commit = await api('GET', `/repos/${repo}/commits/${encodeURIComponent(branch)}`);
  return commit?.commit?.committer?.date ?? commit?.commit?.author?.date ?? null;
}

/** Age in days of the oldest open PR, ignoring PRs marked "do not merge" (label or title); null when none. */
export function oldestOpenPr(pulls, now = new Date()) {
  const open = pulls.filter((p) => !HOLD_PR.test(p.title ?? '') && !(p.labels ?? []).some((l) => HOLD_PR.test(l.name ?? '')));
  if (!open.length) return { number: null, ageDays: 0, held: pulls.length };
  const oldest = open.reduce((a, b) => (new Date(b.created_at) < new Date(a.created_at) ? b : a));
  return { number: oldest.number, url: oldest.html_url, ageDays: Math.max(0, Math.floor((now - new Date(oldest.created_at)) / DAY_MS)), held: pulls.length - open.length };
}

/** Collects the operations values for one repo. `pulls` are its open PRs already read. */
export async function collectOps(api, repo, { pulls = [], now = new Date(), branch = 'main' } = {}) {
  return {
    ci: await safe(() => lastMainCi(api, repo, branch)),
    dependabot: await safe(() => countAlerts(api, `/repos/${repo}/dependabot/alerts`)),
    codeScanning: await safe(() => countAlerts(api, `/repos/${repo}/code-scanning/alerts`)),
    lastMerge: await safe(() => lastMainMerge(api, repo, branch)),
    oldestPr: oldestOpenPr(pulls, now),
  };
}

const ago = (iso, now) => {
  if (!iso) return null;
  const days = Math.floor((now - new Date(iso)) / DAY_MS);
  return days <= 0 ? 'today' : `${days}d ago`;
};

const alertText = (a) => (a ? `${a.count}${a.more ? '+' : ''}` : '?');

/** Report cells for the four columns: { ci, alerts, merge, pr }. */
export function opsCells(ops, now = new Date()) {
  if (!ops) return { ci: '—', alerts: '—', merge: '—', pr: '—' };
  const ci = !ops.ci ? '?' : ops.ci.conclusion === 'none' ? 'no run' : `${ops.ci.conclusion === 'success' ? '✓' : `✗ ${ops.ci.conclusion}`} ${ago(ops.ci.at, now)}`;
  const failing = [ops.dependabot, ops.codeScanning].some((a) => a?.count);
  const alerts = `${failing ? '✗ ' : ''}${alertText(ops.dependabot)} / ${alertText(ops.codeScanning)}`;
  const merge = ops.lastMerge ? ago(ops.lastMerge, now) : '?';
  const pr = ops.oldestPr.number ? `[#${ops.oldestPr.number}](${ops.oldestPr.url}) ${ops.oldestPr.ageDays}d` : 'none';
  return { ci, alerts, merge, pr };
}

// ---- Daily trend (docs/compliance-history.csv) -------------------------------------------------------------------

export const HISTORY_PATH = 'docs/compliance-history.csv';
const HISTORY_HEADER = 'date,fail,warn';

/** Number of ✗ and △ items across all repos, the same items the report tables show. */
export function countItems(statuses) {
  let fail = 0;
  let warn = 0;
  for (const s of statuses) {
    if (s.unknown) continue;
    fail += (s.problems?.length ?? 0) + (s.packages ?? []).filter((p) => !p.ok).length + (s.envProblems?.length ?? 0) + (s.epics?.orphans.length ?? 0);
    for (const r of s.settings ?? []) {
      if (r.status === 'fail') fail++;
      else if (r.status === 'warn') warn++;
    }
    if (s.korean?.files.length) warn++;
    if (s.ops?.ci && s.ops.ci.conclusion !== 'success' && s.ops.ci.conclusion !== 'none') fail++;
    fail += (s.ops?.dependabot?.count ?? 0) > 0 ? 1 : 0;
    fail += (s.ops?.codeScanning?.count ?? 0) > 0 ? 1 : 0;
  }
  return { fail, warn };
}

export function parseHistory(text) {
  return (text ?? '')
    .split('\n')
    .map((l) => l.trim().split(','))
    .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .map(([date, fail, warn]) => ({ date, fail: Number(fail), warn: Number(warn) }));
}

/** The history with today's line added (or replaced when today is already there), oldest first, newest last. */
export function updateHistory(text, date, counts) {
  const rows = parseHistory(text).filter((r) => r.date !== date);
  rows.push({ date, ...counts });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return `${HISTORY_HEADER}\n${rows.map((r) => `${r.date},${r.fail},${r.warn}`).join('\n')}\n`;
}

/** Markdown lines for the trend of the last `days` rows. */
export function renderTrend(historyText, days = 14) {
  const rows = parseHistory(historyText).slice(-days);
  if (!rows.length) return [];
  const arrow = (now, before) => (before === undefined ? '' : now < before ? ' ↓' : now > before ? ' ↑' : ' →');
  return [
    '',
    '## Trend (last 14 days)',
    '',
    `Items over time from [compliance-history.csv](compliance-history.csv): ✗ = failing items, △ = recommended items, all repos together.`,
    '',
    '| Date | ✗ | △ |',
    '|---|---|---|',
    ...rows.map((r, i) => `| ${r.date} | ${r.fail}${arrow(r.fail, rows[i - 1]?.fail)} | ${r.warn}${arrow(r.warn, rows[i - 1]?.warn)} |`),
    '',
  ];
}
