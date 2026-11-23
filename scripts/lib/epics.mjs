// Backlog structure check (#1065): every open work issue sits under an epic, and an epic whose
// sub-issues are all closed is closed too. std-backlog sections 5 and 6 are the rule; this module checks it.
// Uses only the GitHub REST API (issues carry `parent_issue_url` and `sub_issues_summary`).

const MAX_PAGES = 10;
// An epic whose body says one of these is left open on purpose (an umbrella that gets new sub-issues later).
const KEEP_OPEN = /\b(keep (this |it |the epic )?open|do not (auto[- ]?)?close|never close)\b/i;

export const isEpic = (issue) => (issue.labels ?? []).some((l) => (typeof l === 'string' ? l : l.name) === 'epic');

/** Every open issue of a repo (pull requests excluded), up to MAX_PAGES x 100. */
export async function fetchOpenIssues(api, repo) {
  const issues = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await api('GET', `/repos/${repo}/issues?state=open&per_page=100&page=${page}`);
    if (!batch) throw new Error(`cannot list issues of ${repo}`);
    issues.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return issues;
}

/**
 * Splits open issues into work issues without a parent and finished epics.
 * Bot-created issues are ignored. Epics themselves need no parent.
 * Returns { orphans: [{ number, title }], finished: [{ number, title, total }] }.
 */
export function classifyIssues(issues) {
  const orphans = [];
  const finished = [];
  for (const issue of issues) {
    if (issue.pull_request || issue.user?.type === 'Bot') continue;
    if (isEpic(issue)) {
      const { total = 0, completed = 0 } = issue.sub_issues_summary ?? {};
      if (total > 0 && completed === total && !KEEP_OPEN.test(issue.body ?? '')) finished.push({ number: issue.number, title: issue.title, total });
    } else if (!issue.parent_issue_url) orphans.push({ number: issue.number, title: issue.title });
  }
  return { orphans, finished };
}

/** Reads one repo's backlog structure. */
export async function collectEpicState(api, repo) {
  return classifyIssues(await fetchOpenIssues(api, repo));
}

/** Closes each finished epic with a comment that names its closed sub-issues. Returns the closed numbers. */
export async function closeFinishedEpics(api, repo, finished) {
  const closed = [];
  for (const epic of finished) {
    const subs = (await api('GET', `/repos/${repo}/issues/${epic.number}/sub_issues?per_page=100`)) ?? [];
    // Re-check just before closing: a sub-issue may have been added or reopened since the list was read.
    if (!subs.length || subs.some((s) => s.state !== 'closed')) continue;
    const names = subs.map((s) => `#${s.number}`).join(', ');
    await api('POST', `/repos/${repo}/issues/${epic.number}/comments`, {
      body: `All ${subs.length} sub-issues are closed (${names}), so this epic is closed by the daily compliance run (#1065). Reopen it, or add the line "keep open" to its body, if more work will be added.`,
    });
    await api('PATCH', `/repos/${repo}/issues/${epic.number}`, { state: 'closed', state_reason: 'completed' });
    closed.push(epic.number);
  }
  return closed;
}
