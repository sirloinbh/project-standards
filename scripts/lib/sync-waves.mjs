// Sync waves (#1055): targets with a lower `wave` are synced first, and the next wave starts only when the CI checks
// of the sync PRs just opened or updated are green. A target with no `wave` belongs to the last wave.

export const DEFAULT_WAIT = {
  timeoutMs: 20 * 60_000, // per wave
  pollMs: 30_000,
  noChecksGraceMs: 3 * 60_000, // a repo whose PR shows no check run at all is treated as green after this long
};

const BAD = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);
const GOOD = new Set(['success', 'neutral', 'skipped']);

/** The wave number of a target; `Infinity` when it has none (the last wave). */
export const waveOf = (target) => target.wave ?? Number.POSITIVE_INFINITY;

/** Groups targets by wave, first wave first: [{ wave, label, targets }]. Config order is kept inside a wave. */
export function groupWaves(targets) {
  const byWave = new Map();
  for (const t of targets) {
    const key = waveOf(t);
    if (!byWave.has(key)) byWave.set(key, []);
    byWave.get(key).push(t);
  }
  return [...byWave.keys()]
    .sort((a, b) => a - b)
    .map((wave) => ({ wave, label: Number.isFinite(wave) ? String(wave) : 'last', targets: byWave.get(wave) }));
}

/** Classifies a list of check runs: 'red' (one failed), 'pending' (some not done, or none yet), 'green', or 'none'. */
export function classifyChecks(runs) {
  if (!runs.length) return 'none';
  if (runs.some((r) => r.status === 'completed' && BAD.has(r.conclusion))) return 'red';
  if (runs.some((r) => r.status !== 'completed')) return 'pending';
  return runs.every((r) => GOOD.has(r.conclusion)) ? 'green' : 'red';
}

/**
 * Polls the check runs of `branch` in `repo` until they are green or red, or `deadline` passes.
 * Returns { state: 'green' | 'red' | 'timeout', detail }. Needs the App's "Checks: Read" permission.
 */
export async function waitForChecks({ api, repo, branch, sleep, now = Date.now, deadline, pollMs = DEFAULT_WAIT.pollMs, noChecksGraceMs = DEFAULT_WAIT.noChecksGraceMs, log = () => {} }) {
  const started = now();
  for (;;) {
    const answer = await api('GET', `/repos/${repo}/commits/${encodeURIComponent(branch).replaceAll('%2F', '/')}/check-runs?per_page=100`);
    if (!answer) throw new Error(`${repo}: check runs of ${branch} not found`);
    const runs = answer.check_runs ?? [];
    const state = classifyChecks(runs);
    if (state === 'red') {
      const failed = runs.filter((r) => r.status === 'completed' && !GOOD.has(r.conclusion)).map((r) => r.name);
      return { state: 'red', detail: `failed: ${failed.join(', ')}` };
    }
    if (state === 'green') return { state: 'green', detail: `${runs.length} check(s) passed` };
    if (state === 'none' && now() - started >= noChecksGraceMs) {
      log(`${repo}: no check run appeared within ${Math.round(noChecksGraceMs / 1000)}s; treated as green`);
      return { state: 'green', detail: 'no checks' };
    }
    if (now() + pollMs > deadline) return { state: 'timeout', detail: state === 'none' ? 'no check run yet' : `${runs.filter((r) => r.status !== 'completed').length} check(s) still running` };
    await sleep(pollMs);
  }
}

/** The one-line explanation of why later waves were held. */
export const describeHold = ({ wave, failures, held }) =>
  `Sync stopped after wave ${wave}: ${failures.map((f) => `${f.target} (${f.reason})`).join('; ')}. Held on their current central commit: ${held.length ? held.join(', ') : 'none'}. Fix the central change, merge it, and the next push syncs them; run the workflow with all_waves for an urgent fix.`;
