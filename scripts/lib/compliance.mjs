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
  if (value('PORT') !== undefined && value('PORT') !== String(project.ports.api)) problems.push(`PORT ${value('PORT')} ≠ 레지스트리 api ${project.ports.api}`);
  const url = /@localhost:(\d+)\/([a-z0-9_]+)/.exec(value('DATABASE_URL') ?? '');
  if (url && url[1] !== String(project.ports.db)) problems.push(`DATABASE_URL 포트 ${url[1]} ≠ 레지스트리 db ${project.ports.db}`);
  if (url && url[2] !== project.db.name) problems.push(`DATABASE_URL DB 이름 ${url[2]} ≠ 레지스트리 ${project.db.name}`);
  if (value('POSTGRES_DB') !== undefined && value('POSTGRES_DB') !== project.db.name) problems.push(`POSTGRES_DB ${value('POSTGRES_DB')} ≠ 레지스트리 ${project.db.name}`);
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

const cell = (s) => String(s).replace(/\|/g, '\\|');

const MARK = { fail: '✗', warn: '△ 권장', plan: '— 요금제', unknown: '? 확인 못 함' };

/** One cell for the repository settings column (#22): failures, recommendations, unknowns. */
function settingsCell(s) {
  if (!s.settings) return s.settingsError ? '확인 못 함' : '—';
  const count = (status) => s.settings.filter((r) => r.status === status).length;
  const parts = [count('fail') && `✗ ${count('fail')}`, count('warn') && `△ ${count('warn')}`, count('unknown') && `? ${count('unknown')}`].filter(Boolean);
  return parts.length ? parts.join(' ') : '✓';
}

export function renderCompliance(statuses, { generatedAt, centralSha }) {
  const lines = [
    '# 준수 현황',
    '',
    `<!-- 자동 생성 파일(scripts/compliance.mjs). 직접 고치지 않는다. 생성: ${generatedAt}, 중앙 ${centralSha.slice(0, 7)} -->`,
    '',
    '| 리포 | 동기화 | 동기화 기준 중앙 커밋 | 관리 파일 | 공유 패키지 | 열린 동기화 PR | .env.example | 리포 설정 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const s of statuses) {
    if (s.unknown) {
      lines.push(`| ${s.repo} | 확인 못 함 (${s.unknown}) | — | — | — | — | — | — |`);
      continue;
    }
    const files = !s.synced ? '—' : s.problems.length ? `✗ ${s.problems.length}개 다름` : '✓ 일치';
    const pkgs = !s.packages.length ? '—' : s.packages.every((p) => p.ok) ? '✓' : `✗ ${s.packages.filter((p) => !p.ok).map((p) => `${p.name} ${p.actual ?? '없음'}≠${p.expected}`).join(', ')}`;
    const pr = s.syncPr ? `[#${s.syncPr.number}](${s.syncPr.url}) ${s.syncPr.ageDays}일째` : '없음';
    const env = s.profile !== 'app' ? '—' : s.envProblems.length ? `✗ ${s.envProblems.length}개 다름` : '✓';
    lines.push(`| ${s.repo} | ${s.synced ? '✓' : '아직 안 됨'} | ${s.centralSha ? `\`${s.centralSha.slice(0, 7)}\`` : '—'} | ${files} | ${pkgs} | ${pr} | ${env} | ${settingsCell(s)} |`);
  }
  const details = statuses.filter((s) => !s.unknown && (s.problems.length || s.envProblems.length));
  if (details.length) {
    lines.push('', '## 다른 곳', '');
    for (const s of details) {
      lines.push(`### ${s.repo}`, '');
      for (const p of s.problems) lines.push(`- 관리 파일 \`${cell(p)}\``);
      for (const p of s.envProblems) lines.push(`- .env.example: ${cell(p)}`);
      lines.push('');
    }
  }
  const withSettings = statuses.filter((s) => s.settings?.some((r) => r.status !== 'ok'));
  if (withSettings.length) {
    lines.push('', '## 리포 설정', '', '기준과 이유는 [repo-settings.md](repo-settings.md)에 있다. secret·variable은 이름만 비교한다.', '');
    for (const s of withSettings) {
      lines.push(`### ${s.repo}`, '', '| 상태 | 항목 | 지금 | 기준 |', '|---|---|---|---|');
      for (const r of s.settings.filter((x) => x.status !== 'ok')) lines.push(`| ${MARK[r.status]} | ${cell(r.label)} | ${cell(r.actual)} | ${cell(r.expected)} |`);
      lines.push('');
    }
  }
  lines.push('', '고치는 방법은 [README](../README.md)의 "하위 리포에서 standards-check가 실패했을 때"를 따른다.', '');
  return lines.join('\n');
}

export function renderEnvMatrix(statuses, { generatedAt }) {
  const lines = [
    '# 환경변수 한눈에 보기',
    '',
    `<!-- 자동 생성 파일(scripts/compliance.mjs). 원본은 각 리포의 .env.example이다. 비밀값은 표시하지 않는다. 생성: ${generatedAt} -->`,
    '',
    '규칙: [env-conventions.md](env-conventions.md)',
    '',
  ];
  for (const s of statuses.filter((x) => x.profile === 'app')) {
    lines.push(`## ${s.repo}`, '');
    if (s.unknown) {
      lines.push(`확인 못 함 (${s.unknown}).`, '');
      continue;
    }
    if (!s.env.length) {
      lines.push('`.env.example`이 없다.', '');
      continue;
    }
    lines.push('| 키 | 설명 | 필수 | 비밀 | 기본값 | 쓰는 곳 | 구간 |', '|---|---|---|---|---|---|---|');
    for (const e of s.env) {
      const shown = e.secret ? '(비밀)' : e.value ? `\`${cell(e.value)}\`` : '';
      lines.push(`| \`${e.key}\` | ${cell(e.desc || '(설명 없음)')} | ${e.required ? '예' : ''} | ${e.secret ? '예' : ''} | ${shown} | ${e.used.join(', ')} | ${e.section === 'central' ? '공통' : '프로젝트'} |`);
    }
    if (s.envProblems.length) lines.push('', ...s.envProblems.map((p) => `- ✗ ${p}`));
    lines.push('');
  }
  return lines.join('\n');
}
