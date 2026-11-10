// Reads a repository's GitHub settings and Actions secret/variable NAMES, and compares them with
// the standard in docs/repo-settings.md (#22). Values never leave this module: the secrets API only
// returns names, and variable values are dropped as soon as they arrive.

// GitHub Free does not offer branch protection, rulesets, secret scanning or code scanning on private repositories.
const PLAN_LIMIT = /Upgrade to GitHub Pro|make this repository public/i;
const NAME = /^[A-Z_][A-Z0-9_]*$/;

async function safe(read) {
  try {
    return { value: await read() };
  } catch (error) {
    return PLAN_LIMIT.test(error.message) ? { plan: true } : { error: error.message };
  }
}

/** Collects the facts for one repository. `api` is the client from github-app.mjs (404 GET → null). */
export async function collectSettings(api, repo) {
  const base = `/repos/${repo}`;
  const info = await safe(() => api('GET', base));
  const branch = info.value?.default_branch ?? 'main';
  const [workflow, protection, alerts, fixes, secrets, variables, codeql] = await Promise.all([
    safe(() => api('GET', `${base}/actions/permissions/workflow`)),
    safe(() => api('GET', `${base}/branches/${branch}/protection`)),
    // 204 when enabled (the client returns ''), 404 (null) when disabled.
    safe(async () => (await api('GET', `${base}/vulnerability-alerts`)) !== null),
    safe(() => api('GET', `${base}/automated-security-fixes`)),
    safe(() => api('GET', `${base}/actions/secrets?per_page=100`)),
    safe(() => api('GET', `${base}/actions/variables?per_page=30`)),
    // CodeQL default setup: { state: 'configured' | 'not-configured' }. Needs the App's Code scanning alerts read permission.
    safe(() => api('GET', `${base}/code-scanning/default-setup`)),
  ]);
  const r = info.value ?? {};
  const sa = r.security_and_analysis ?? {};
  const names = (result, key) =>
    result.value ? result.value[key].map((x) => x.name).filter((n) => NAME.test(n)).sort() : null;
  const p = protection.value;
  return {
    visibility: r.visibility ?? null,
    defaultBranch: r.default_branch ?? null,
    mergeCommit: r.allow_merge_commit ?? null,
    squashMerge: r.allow_squash_merge ?? null,
    rebaseMerge: r.allow_rebase_merge ?? null,
    deleteBranchOnMerge: r.delete_branch_on_merge ?? null,
    workflowPermissions: workflow.value?.default_workflow_permissions ?? null,
    actionsCanApprove: workflow.value?.can_approve_pull_request_reviews ?? null,
    protection: protection.plan
      ? 'plan'
      : protection.error
        ? null
        : p
          ? {
              requiredChecks: (p.required_status_checks?.checks ?? []).map((c) => c.context).sort(),
              forcePushes: Boolean(p.allow_force_pushes?.enabled),
              deletions: Boolean(p.allow_deletions?.enabled),
            }
          : 'none',
    secretScanning: sa.secret_scanning?.status ?? (r.visibility === 'private' ? 'plan' : null),
    pushProtection: sa.secret_scanning_push_protection?.status ?? (r.visibility === 'private' ? 'plan' : null),
    codeScanning: codeql.value?.state ?? (r.visibility === 'private' ? 'plan' : null),
    vulnerabilityAlerts: alerts.value ?? null,
    securityFixes: fixes.value ? Boolean(fixes.value.enabled) : null,
    secrets: names(secrets, 'secrets'),
    variables: names(variables, 'variables'),
  };
}

const on = (v) => (v === null ? '?' : v ? 'on' : 'off');

/**
 * Judges the facts. Returns [{ id, label, status, actual, expected }] where status is
 * "ok", "fail", "warn" (recommended only), "plan" (not available on GitHub Free for private repos) or "unknown".
 */
export function evaluateSettings(facts, { secrets = [], variables = [] } = {}) {
  const rows = [];
  const add = (id, label, status, actual, expected) => rows.push({ id, label, status, actual, expected });
  const yes = (value, want, level = 'fail') => (value === null ? 'unknown' : value === want ? 'ok' : level);

  add('default-branch', 'Default branch', facts.defaultBranch === null ? 'unknown' : facts.defaultBranch === 'main' ? 'ok' : 'fail', facts.defaultBranch ?? '?', 'main');
  add('merge-commit', 'Allow merge commits', yes(facts.mergeCommit, true), on(facts.mergeCommit), 'on');
  add('squash-merge', 'Squash merge', yes(facts.squashMerge, false, 'warn'), on(facts.squashMerge), 'off (recommended)');
  add('rebase-merge', 'Rebase merge', yes(facts.rebaseMerge, false, 'warn'), on(facts.rebaseMerge), 'off (recommended)');
  add('delete-branch', 'Auto-delete branch after merge', yes(facts.deleteBranchOnMerge, true, 'warn'), on(facts.deleteBranchOnMerge), 'on (recommended)');
  add('workflow-permissions', 'Actions default token permission', facts.workflowPermissions === null ? 'unknown' : facts.workflowPermissions === 'read' ? 'ok' : 'fail', facts.workflowPermissions ?? '?', 'read');
  add('actions-approve', 'Actions can approve PRs', yes(facts.actionsCanApprove, false), on(facts.actionsCanApprove), 'off');

  const p = facts.protection;
  if (p === 'plan') add('branch-protection', 'main branch protection', 'plan', 'not available for private repos on the Free plan', 'on');
  else if (p === null) add('branch-protection', 'main branch protection', 'unknown', '?', 'on');
  else if (p === 'none') add('branch-protection', 'main branch protection', 'fail', 'none', 'on');
  else {
    const problems = [];
    if (!p.requiredChecks.length) problems.push('no required checks');
    if (p.forcePushes) problems.push('force push allowed');
    if (p.deletions) problems.push('deletion allowed');
    add('branch-protection', 'main branch protection', problems.length ? 'fail' : 'ok', problems.length ? problems.join(', ') : `required checks ${p.requiredChecks.join(', ')}`, 'on, at least 1 required check, no force push or deletion');
  }
  for (const [id, label, value] of [
    ['secret-scanning', 'secret scanning', facts.secretScanning],
    ['push-protection', 'push protection (secret blocking)', facts.pushProtection],
  ]) {
    if (value === 'plan') add(id, label, 'plan', 'not available for private repos on the Free plan', 'enabled');
    else add(id, label, value === null ? 'unknown' : value === 'enabled' ? 'ok' : 'fail', value ?? '?', 'enabled');
  }
  const cs = facts.codeScanning;
  if (cs === 'plan') add('code-scanning', 'CodeQL code scanning (default setup)', 'plan', 'not available for private repos on the Free plan', 'configured');
  else add('code-scanning', 'CodeQL code scanning (default setup)', cs === undefined || cs === null ? 'unknown' : cs === 'configured' ? 'ok' : 'fail', cs ?? '?', 'configured');
  add('vulnerability-alerts', 'Dependabot vulnerability alerts', yes(facts.vulnerabilityAlerts, true), on(facts.vulnerabilityAlerts), 'on');
  add('security-fixes', 'Dependabot security updates', yes(facts.securityFixes, true), on(facts.securityFixes), 'on');

  for (const [id, label, actual, expected] of [
    ['secrets', 'Actions secret names', facts.secrets, secrets],
    ['variables', 'Actions variable names', facts.variables, variables],
  ]) {
    if (actual === null) {
      add(id, label, 'unknown', '?', expected.join(', ') || 'none');
      continue;
    }
    const missing = expected.filter((n) => !actual.includes(n));
    const extra = actual.filter((n) => !expected.includes(n));
    const status = missing.length ? 'fail' : extra.length ? 'warn' : 'ok';
    const shown = [missing.length ? `missing: ${missing.join(', ')}` : '', extra.length ? `not in the list: ${extra.join(', ')}` : ''].filter(Boolean).join(' / ');
    add(id, label, status, shown || actual.join(', ') || 'none', expected.join(', ') || 'none');
  }
  return rows;
}
