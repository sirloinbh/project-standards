// Merges a sync PR itself for targets with `autoMergeSync: true` (#1105, ADR-0030).
// It runs after the PR is opened or updated, waits for green checks, and merges with a merge commit using the App token.
// Every skip is reported as a workflow warning and leaves the PR open for the agent's review.
import { waitForChecks } from './sync-waves.mjs';

// Same prefix as scripts/lib/sync-pr.mjs; every commit the sync creates starts with it.
const COMMIT_PREFIX = 'chore: sync central standards (project-standards@';

/** The items under "## Check before merging" in a sync PR body; empty when the section says "None" or is absent. */
export function pendingConfirmations(body = '') {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^##\s+Check before merging\s*$/i.test(l));
  if (start === -1) return [];
  const items = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    const item = line.match(/^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/)?.[1]?.trim();
    if (item && !/^none\.?$/i.test(item)) items.push(item);
  }
  return items;
}

/**
 * Merges the sync PR of one target. Returns { merged: boolean, reason }.
 * `result` is the syncTarget result ({ pr, number, branch }); `deadline` bounds the wait for checks.
 */
export async function autoMergeSyncPr({ api, repo, result, sleep, deadline, pollMs, noChecksGraceMs, log = () => {} }) {
  const skip = (reason) => {
    log(`::warning::${repo}: sync PR ${result.pr ?? ''} was not merged automatically: ${reason}. It stays open for review.`);
    return { merged: false, reason };
  };
  if (!result.number) return skip('the PR number is unknown');
  const pull = await api('GET', `/repos/${repo}/pulls/${result.number}`);
  if (!pull || pull.state !== 'open') return skip('the PR is not open');
  const pending = pendingConfirmations(pull.body);
  if (pending.length) return skip(`"Check before merging" has ${pending.length} item(s) for the user`);
  const commits = await api('GET', `/repos/${repo}/pulls/${result.number}/commits?per_page=100`);
  const direct = (commits ?? []).filter((c) => !c.commit.message.startsWith(COMMIT_PREFIX));
  if (!commits || direct.length) return skip(direct.length ? `${direct.length} commit(s) were added by hand` : 'the commits could not be listed');

  let checked;
  try {
    checked = await waitForChecks({ api, repo, branch: result.branch, sleep, deadline, pollMs, noChecksGraceMs, log });
  } catch (error) {
    return skip(/ 403 /.test(error.message) ? 'the sync App cannot read check runs (grant Checks: Read, docs/github-app.md)' : `could not read checks: ${error.message}`);
  }
  if (checked.state !== 'green') return skip(`CI ${checked.state}: ${checked.detail}`);

  try {
    // `sha` makes GitHub refuse the merge when someone pushed after the checks were read.
    await api('PUT', `/repos/${repo}/pulls/${result.number}/merge`, { merge_method: 'merge', sha: pull.head.sha });
  } catch (error) {
    return skip(`GitHub refused the merge: ${error.message}`);
  }
  log(`${repo}: merged sync PR ${result.pr} (merge commit, ${checked.detail})`);
  return { merged: true, reason: checked.detail };
}
