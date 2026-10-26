// Reads a repository's GitHub settings and Actions secret/variable NAMES, and compares them with
// the standard in docs/repo-settings.md (#22). Values never leave this module: the secrets API only
// returns names, and variable values are dropped as soon as they arrive.

// GitHub Free does not offer branch protection, rulesets or secret scanning on private repositories.
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
  const [workflow, protection, alerts, fixes, secrets, variables] = await Promise.all([
    safe(() => api('GET', `${base}/actions/permissions/workflow`)),
    safe(() => api('GET', `${base}/branches/${branch}/protection`)),
    // 204 when enabled (the client returns ''), 404 (null) when disabled.
    safe(async () => (await api('GET', `${base}/vulnerability-alerts`)) !== null),
    safe(() => api('GET', `${base}/automated-security-fixes`)),
    safe(() => api('GET', `${base}/actions/secrets?per_page=100`)),
    safe(() => api('GET', `${base}/actions/variables?per_page=30`)),
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
    vulnerabilityAlerts: alerts.value ?? null,
    securityFixes: fixes.value ? Boolean(fixes.value.enabled) : null,
    secrets: names(secrets, 'secrets'),
    variables: names(variables, 'variables'),
  };
}

const on = (v) => (v === null ? '?' : v ? '켬' : '끔');

/**
 * Judges the facts. Returns [{ id, label, status, actual, expected }] where status is
 * "ok", "fail", "warn" (recommended only), "plan" (not available on GitHub Free for private repos) or "unknown".
 */
export function evaluateSettings(facts, { secrets = [], variables = [] } = {}) {
  const rows = [];
  const add = (id, label, status, actual, expected) => rows.push({ id, label, status, actual, expected });
  const yes = (value, want, level = 'fail') => (value === null ? 'unknown' : value === want ? 'ok' : level);

  add('default-branch', '기본 브랜치', facts.defaultBranch === null ? 'unknown' : facts.defaultBranch === 'main' ? 'ok' : 'fail', facts.defaultBranch ?? '?', 'main');
  add('merge-commit', '병합 커밋 허용', yes(facts.mergeCommit, true), on(facts.mergeCommit), '켬');
  add('squash-merge', 'squash 병합', yes(facts.squashMerge, false, 'warn'), on(facts.squashMerge), '끔 (권장)');
  add('rebase-merge', 'rebase 병합', yes(facts.rebaseMerge, false, 'warn'), on(facts.rebaseMerge), '끔 (권장)');
  add('delete-branch', '병합 후 브랜치 자동 삭제', yes(facts.deleteBranchOnMerge, true, 'warn'), on(facts.deleteBranchOnMerge), '켬 (권장)');
  add('workflow-permissions', 'Actions 기본 토큰 권한', facts.workflowPermissions === null ? 'unknown' : facts.workflowPermissions === 'read' ? 'ok' : 'fail', facts.workflowPermissions ?? '?', 'read');
  add('actions-approve', 'Actions의 PR 승인', yes(facts.actionsCanApprove, false), on(facts.actionsCanApprove), '끔');

  const p = facts.protection;
  if (p === 'plan') add('branch-protection', 'main 브랜치 보호', 'plan', '비공개 리포라 Free 요금제에서 쓸 수 없음', '켬');
  else if (p === null) add('branch-protection', 'main 브랜치 보호', 'unknown', '?', '켬');
  else if (p === 'none') add('branch-protection', 'main 브랜치 보호', 'fail', '없음', '켬');
  else {
    const problems = [];
    if (!p.requiredChecks.length) problems.push('필수 검사 없음');
    if (p.forcePushes) problems.push('강제 push 허용');
    if (p.deletions) problems.push('삭제 허용');
    add('branch-protection', 'main 브랜치 보호', problems.length ? 'fail' : 'ok', problems.length ? problems.join(', ') : `필수 검사 ${p.requiredChecks.join(', ')}`, '켬, 필수 검사 1개 이상, 강제 push·삭제 금지');
  }
  for (const [id, label, value] of [
    ['secret-scanning', 'secret scanning', facts.secretScanning],
    ['push-protection', 'push protection (secret 차단)', facts.pushProtection],
  ]) {
    if (value === 'plan') add(id, label, 'plan', '비공개 리포라 Free 요금제에서 쓸 수 없음', 'enabled');
    else add(id, label, value === null ? 'unknown' : value === 'enabled' ? 'ok' : 'fail', value ?? '?', 'enabled');
  }
  add('vulnerability-alerts', 'Dependabot 취약점 알림', yes(facts.vulnerabilityAlerts, true), on(facts.vulnerabilityAlerts), '켬');
  add('security-fixes', 'Dependabot 보안 업데이트', yes(facts.securityFixes, true), on(facts.securityFixes), '켬');

  for (const [id, label, actual, expected] of [
    ['secrets', 'Actions secret 이름', facts.secrets, secrets],
    ['variables', 'Actions variable 이름', facts.variables, variables],
  ]) {
    if (actual === null) {
      add(id, label, 'unknown', '?', expected.join(', ') || '없음');
      continue;
    }
    const missing = expected.filter((n) => !actual.includes(n));
    const extra = actual.filter((n) => !expected.includes(n));
    const status = missing.length ? 'fail' : extra.length ? 'warn' : 'ok';
    const shown = [missing.length ? `없음: ${missing.join(', ')}` : '', extra.length ? `목록에 없는 이름: ${extra.join(', ')}` : ''].filter(Boolean).join(' / ');
    add(id, label, status, shown || actual.join(', ') || '없음', expected.join(', ') || '없음');
  }
  return rows;
}
