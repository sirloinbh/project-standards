// Builds the compliance report (docs/compliance.md) and the environment variable matrix
// (docs/env-matrix.md) from what each project repository currently contains.
// Secret values never leave this module: only key names and metadata are rendered.
import { checkManifest, MANIFEST_PATH } from './manifest.mjs';
import { BRANCH_PREFIX } from './sync-pr.mjs';

const TAG = /@(desc|required|secret|used)(?:=([^\s@]+)|\s+([^@]*))?/g;

/** Parses .env.example: [{ key, value, desc, required, secret, used, section }]. */
export function parseEnvExample(text) {
  const entries = [];
  let comment = '';
  let section = 'central';
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (line === '# --- project ---') {
      section = 'project';
      comment = '';
    } else if (line.startsWith('#')) comment = line.slice(1).trim();
    else if (/^[A-Z][A-Z0-9_]*=/.test(line)) {
      const [key, ...rest] = line.split('=');
      const meta = { desc: '', required: false, secret: false, used: [] };
      for (const m of comment.matchAll(TAG)) {
        if (m[1] === 'desc') meta.desc = (m[3] ?? '').trim();
        if (m[1] === 'required') meta.required = true;
        if (m[1] === 'secret') meta.secret = true;
        if (m[1] === 'used') meta.used = (m[2] ?? m[3] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      // Without tags, guess secrecy from the name so a legacy file never leaks a password.
      if (!comment.includes('@') && /PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL/.test(key)) meta.secret = true;
      entries.push({ key, value: rest.join('='), ...meta, section });
      comment = '';
    } else comment = '';
  }
  return entries;
}

/** Registry cross-check for .env.example values: returns human-readable mismatches. */
export function envMismatches(entries, project) {
  const problems = [];
  const value = (k) => entries.find((e) => e.key === k)?.value;
  if (value('PORT') !== undefined && value('PORT') !== String(project.ports.api)) problems.push(`PORT ${value('PORT')} ≠ registry api ${project.ports.api}`);
  const url = /@localhost:(\d+)\/([a-z0-9_]+)/.exec(value('DATABASE_URL') ?? '');
  if (url && url[1] !== String(project.ports.db)) problems.push(`DATABASE_URL port ${url[1]} ≠ registry db ${project.ports.db}`);
  if (url && url[2] !== project.db.name) problems.push(`DATABASE_URL DB name ${url[2]} ≠ registry ${project.db.name}`);
  if (value('POSTGRES_DB') !== undefined && value('POSTGRES_DB') !== project.db.name) problems.push(`POSTGRES_DB ${value('POSTGRES_DB')} ≠ registry ${project.db.name}`);
  return problems;
}

/**
 * Collects one repository's status. `read(path)` returns text or null; `pulls` are its open PRs.
 * Returns { repo, profile, synced, centralSha, problems, packages, syncPr, env, envProblems }.
 */
export function repoStatus({ target, project, read, pulls = [], now = new Date() }) {
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

export function renderCompliance(statuses, { generatedAt, centralSha }) {
  const lines = [
    '# Compliance status',
    '',
    `<!-- Generated file (scripts/compliance.mjs). Do not edit by hand. Generated: ${generatedAt}, central ${centralSha.slice(0, 7)} -->`,
    '',
    '| Repo | Synced | Central commit synced from | Managed files | Shared packages | Open sync PR | .env.example | Repo settings |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const s of statuses) {
    if (s.unknown) {
      lines.push(`| ${s.repo} | unknown (${s.unknown}) | — | — | — | — | — | — |`);
      continue;
    }
    const files = !s.synced ? '—' : s.problems.length ? `✗ ${s.problems.length} differ` : '✓ match';
    const pkgs = !s.packages.length ? '—' : s.packages.every((p) => p.ok) ? '✓' : `✗ ${s.packages.filter((p) => !p.ok).map((p) => `${p.name} ${p.actual ?? 'none'}≠${p.expected}`).join(', ')}`;
    const pr = s.syncPr ? `[#${s.syncPr.number}](${s.syncPr.url}) ${s.syncPr.ageDays} days old` : 'none';
    const env = s.profile !== 'app' ? '—' : s.envProblems.length ? `✗ ${s.envProblems.length} differ` : '✓';
    lines.push(`| ${s.repo} | ${s.synced ? '✓' : 'not yet'} | ${s.centralSha ? `\`${s.centralSha.slice(0, 7)}\`` : '—'} | ${files} | ${pkgs} | ${pr} | ${env} | ${settingsCell(s)} |`);
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
    lines.push('| Key | Description | Required | Secret | Default | Used by | Section |', '|---|---|---|---|---|---|---|');
    for (const e of s.env) {
      const shown = e.secret ? '(secret)' : e.value ? `\`${cell(e.value)}\`` : '';
      lines.push(`| \`${e.key}\` | ${cell(e.desc || '(no description)')} | ${e.required ? 'yes' : ''} | ${e.secret ? 'yes' : ''} | ${shown} | ${e.used.join(', ')} | ${e.section === 'central' ? 'central' : 'project'} |`);
    }
    if (s.envProblems.length) lines.push('', ...s.envProblems.map((p) => `- ✗ ${p}`));
    lines.push('');
  }
  return lines.join('\n');
}
