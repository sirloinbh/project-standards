// Builds the compliance report (docs/compliance.md) and the environment variable matrix
// (docs/env-matrix.md) from what each project repository currently contains.
// Secret values never leave this module: only key names and metadata are rendered.
import { checkManifest, MANIFEST_PATH } from './manifest.mjs';
import { parseEnvExample, ssmProblems } from './env-tags.mjs';
import { BRANCH_PREFIX } from './sync-pr.mjs';

export { parseEnvExample };

/** Registry cross-check for .env.example values: returns human-readable mismatches. */
export function envMismatches(entries, project) {
  const problems = [];
  const value = (k) => entries.find((e) => e.key === k)?.value;
  if (value('PORT') !== undefined && value('PORT') !== String(project.ports.api)) problems.push(`PORT ${value('PORT')} ≠ registry api ${project.ports.api}`);
  const url = /@localhost:(\d+)\/([a-z0-9_]+)/.exec(value('DATABASE_URL') ?? '');
  if (url && url[1] !== String(project.ports.db)) problems.push(`DATABASE_URL port ${url[1]} ≠ registry db ${project.ports.db}`);
  if (url && url[2] !== project.db.name) problems.push(`DATABASE_URL DB name ${url[2]} ≠ registry ${project.db.name}`);
  if (value('POSTGRES_DB') !== undefined && value('POSTGRES_DB') !== project.db.name) problems.push(`POSTGRES_DB ${value('POSTGRES_DB')} ≠ registry ${project.db.name}`);
  problems.push(...ssmProblems(entries, project.name));
  return problems;
}

/**
 * Collects one repository's status. `read(path)` returns text or null; `pulls` are its open PRs.
 * `korean` is the optional result of koreanStats (#493).
 * Returns { repo, profile, synced, centralSha, problems, packages, syncPr, env, envProblems, korean }.
 */
export function repoStatus({ target, project, read, pulls = [], now = new Date(), korean = null }) {
  const manifestText = read(MANIFEST_PATH);
  const manifest = manifestText ? JSON.parse(manifestText) : null;
  const problems = manifest ? checkManifest(manifest, read).map((p) => `${p.path}: ${p.reason}`) : [];
  const packages = [];
  if (manifest) {
    // Sync puts some packages in workspace package.json files (frontend/, backend/), not the root.
    const pkgPaths = ['package.json', ...Object.keys(manifest.files ?? {}).filter((p) => p.endsWith('/package.json'))];
    const pkgs = pkgPaths.map((p) => read(p)).filter(Boolean).map((text) => JSON.parse(text));
    for (const [name, expected] of Object.entries(manifest.packages ?? {})) {
      if (!expected) continue;
      const found = pkgs.map((pkg) => pkg.devDependencies?.[name] ?? pkg.dependencies?.[name]).filter((v) => v !== undefined);
      const actual = found.find((v) => v !== expected) ?? found[0] ?? null;
      packages.push({ name, expected, actual, ok: actual === expected });
    }
  }
  const pr = pulls.find((p) => p.head?.ref?.startsWith(BRANCH_PREFIX));
  const syncPr = pr ? { number: pr.number, url: pr.html_url, ageDays: Math.floor((now - new Date(pr.created_at)) / 86_400_000) } : null;
  const envText = read('.env.example');
  const env = envText ? parseEnvExample(envText) : [];
  return {
    repo: target.repo,
    profile: target.profile,
    synced: Boolean(manifest),
    centralSha: manifest?.centralSha ?? null,
    problems,
    packages,
    syncPr,
    env,
    envProblems: project && envText ? envMismatches(env, project) : [],
    korean,
  };
}

/** A Markdown table cell: backslashes first, so a value ending in "\" cannot escape the next "|" (#290). */
export const cell = (s) => String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

const MARK = { fail: '✗', warn: '△ recommended', plan: '— plan', unknown: '? unknown' };

/** One cell for the repository settings column (#22): failures, recommendations, unknowns. */
function settingsCell(s) {
  if (!s.settings) return s.settingsError ? 'unknown' : '—';
  const count = (status) => s.settings.filter((r) => r.status === status).length;
  const parts = [count('fail') && `✗ ${count('fail')}`, count('warn') && `△ ${count('warn')}`, count('unknown') && `? ${count('unknown')}`].filter(Boolean);
  return parts.length ? parts.join(' ') : '✓';
}

/** One cell for the Korean-text column (#493): a warning (not a failure) while translation is in progress. */
export function koreanCell(k) {
  if (!k) return '—';
  if (!k.markdownFiles && !k.commentLines) return k.partial ? '✓ (partial scan)' : '✓';
  return `△ ${k.markdownFiles} md, ${k.commentLines} comments${k.partial ? ' (partial scan)' : ''}`;
}

export function renderCompliance(statuses, { generatedAt, centralSha }) {
  const lines = [
    '# Compliance status',
    '',
    `<!-- Generated file (scripts/compliance.mjs). Do not edit by hand. Generated: ${generatedAt}, central ${centralSha.slice(0, 7)} -->`,
    '',
    '| Repo | Synced | Central commit synced from | Managed files | Shared packages | Open sync PR | .env.example | Repo settings | Korean text |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const s of statuses) {
    if (s.unknown) {
      lines.push(`| ${s.repo} | unknown (${s.unknown}) | — | — | — | — | — | — | — |`);
      continue;
    }
    const files = !s.synced ? '—' : s.problems.length ? `✗ ${s.problems.length} differ` : '✓ match';
    const pkgs = !s.packages.length ? '—' : s.packages.every((p) => p.ok) ? '✓' : `✗ ${s.packages.filter((p) => !p.ok).map((p) => `${p.name} ${p.actual ?? 'none'}≠${p.expected}`).join(', ')}`;
    const pr = s.syncPr ? `[#${s.syncPr.number}](${s.syncPr.url}) ${s.syncPr.ageDays} days old` : 'none';
    const env = s.profile !== 'app' ? '—' : s.envProblems.length ? `✗ ${s.envProblems.length} differ` : '✓';
    lines.push(`| ${s.repo} | ${s.synced ? '✓' : 'not yet'} | ${s.centralSha ? `\`${s.centralSha.slice(0, 7)}\`` : '—'} | ${files} | ${pkgs} | ${pr} | ${env} | ${settingsCell(s)} | ${koreanCell(s.korean)} |`);
  }
  const details = statuses.filter((s) => !s.unknown && (s.problems.length || s.envProblems.length));
  if (details.length) {
    lines.push('', '## Differences', '');
    for (const s of details) {
      lines.push(`### ${s.repo}`, '');
      for (const p of s.problems) lines.push(`- Managed file \`${cell(p)}\``);
      for (const p of s.envProblems) lines.push(`- .env.example: ${cell(p)}`);
      lines.push('');
    }
  }
  const withSettings = statuses.filter((s) => s.settings?.some((r) => r.status !== 'ok'));
  if (withSettings.length) {
    lines.push('', '## Repo settings', '', 'The standards and reasons are in [repo-settings.md](repo-settings.md). Secrets and variables are compared by name only.', '');
    for (const s of withSettings) {
      lines.push(`### ${s.repo}`, '', '| Status | Item | Current | Expected |', '|---|---|---|---|');
      for (const r of s.settings.filter((x) => x.status !== 'ok')) lines.push(`| ${MARK[r.status]} | ${cell(r.label)} | ${cell(r.actual)} | ${cell(r.expected)} |`);
      lines.push('');
    }
  }
  const withKorean = statuses.filter((s) => s.korean?.files.length);
  if (withKorean.length) {
    lines.push('', '## Korean text', '', 'Warning only for now (#493). Markdown files and code-comment lines that still contain Korean; the first 10 files per repo are listed. Literals that must stay Korean are on the allow list in `scripts/lib/korean-text.mjs`.', '');
    for (const s of withKorean) {
      lines.push(`### ${s.repo}`, '', ...s.korean.files.slice(0, 10).map((f) => `- \`${cell(f)}\``));
      if (s.korean.files.length > 10) lines.push(`- and ${s.korean.files.length - 10} more`);
      lines.push('');
    }
  }
  lines.push('', 'To fix, follow "When standards-check fails in a sub-repo" in the [README](../README.md).', '');
  return lines.join('\n');
}

export function renderEnvMatrix(statuses, { generatedAt }) {
  const lines = [
    '# Environment variables at a glance',
    '',
    `<!-- Generated file (scripts/compliance.mjs). The source is each repo's .env.example. Secret values are not shown. Generated: ${generatedAt} -->`,
    '',
    'Rules: [env-conventions.md](env-conventions.md)',
    '',
  ];
  for (const s of statuses.filter((x) => x.profile === 'app')) {
    lines.push(`## ${s.repo}`, '');
    if (s.unknown) {
      lines.push(`Unknown (${s.unknown}).`, '');
      continue;
    }
    if (!s.env.length) {
      lines.push('`.env.example` is missing.', '');
      continue;
    }
    lines.push('| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |', '|---|---|---|---|---|---|---|---|');
    for (const e of s.env) {
      const shown = e.secret ? '(secret)' : e.value ? `\`${cell(e.value)}\`` : '';
      lines.push(`| \`${e.key}\` | ${cell(e.desc || '(no description)')} | ${e.required ? 'yes' : ''} | ${e.secret ? 'yes' : ''} | ${shown} | ${e.used.join(', ')} | ${e.ssm ? `\`${cell(e.ssm)}\`` : ''} | ${e.section === 'central' ? 'central' : 'project'} |`);
    }
    if (s.envProblems.length) lines.push('', ...s.envProblems.map((p) => `- ✗ ${p}`));
    lines.push('');
  }
  return lines.join('\n');
}
