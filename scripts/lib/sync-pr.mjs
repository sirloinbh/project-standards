// Opens or updates the standards sync PR in one target repository through the GitHub REST API.
// It never clones the target, so no hook or script of the target repository runs.
import crypto from 'node:crypto';
import { checkEntry, MANIFEST_PATH } from './manifest.mjs';
import { pinRanges } from './pin-ranges.mjs';
import { planTarget } from './sync-plan.mjs';
import { loadIndex } from './templates.mjs';

export const BRANCH_PREFIX = 'chore/standards-sync-';
const CENTRAL = 'sirloinbh/project-standards';

/** Git blob id of a text, so unchanged files are detected without downloading them. */
export const gitBlobSha = (text) => {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
};

/** package.json files and the lockfiles that record their specs: [pkgPath, [[lockPath, workspaceKey]...]]. */
const PACKAGE_FILES = [
  ['package.json', [['package-lock.json', '']]],
  ['frontend/package.json', [['package-lock.json', 'frontend'], ['frontend/package-lock.json', '']]],
  ['backend/package.json', [['package-lock.json', 'backend'], ['backend/package-lock.json', '']]],
];

// Pins ^/~ ranges in the planned package.json files and keeps every lockfile's specs in sync.
function pinPackageFiles(files, read) {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const notes = [];
  const lockEdits = new Map();
  const lockOf = (p) => {
    if (!lockEdits.has(p)) {
      const text = read(p);
      lockEdits.set(p, text === null ? null : JSON.parse(text));
    }
    return lockEdits.get(p);
  };
  for (const [pkgPath, locks] of PACKAGE_FILES) {
    const planned = byPath.get(pkgPath);
    if (!planned?.content || !locks.length || !lockOf(locks[0][0])) continue;
    const [primary, ...others] = locks;
    const result = pinRanges(JSON.parse(planned.content), lockOf(primary[0]), primary[1]);
    if (!result.changes.length && !result.unresolved.length) continue;
    planned.content = `${JSON.stringify(result.pkg, null, 2)}\n`;
    lockEdits.set(primary[0], result.lock);
    for (const [lockPath, key] of others) {
      const lock = lockOf(lockPath);
      if (!lock) continue;
      for (const change of result.changes) {
        const [, section, name, version] = /^(\w+)\.(.+) \S+ → (\S+)$/.exec(change);
        const installed = lock.packages?.[`node_modules/${name}`]?.version;
        if (installed === version && lock.packages?.[key]?.[section]?.[name] !== undefined) lock.packages[key][section][name] = version;
        else if (installed !== version) result.unresolved.push(`${lockPath}: ${name} is installed as ${installed ?? 'missing'}, not ${version} — regenerate this lockfile`);
      }
    }
    notes.push(...result.changes.map((c) => `${pkgPath}: ${c}`), ...result.unresolved.map((u) => `확인 필요 — ${u}`));
  }
  const lockFiles = [...lockEdits]
    .filter(([, lock]) => lock)
    .map(([path, lock]) => ({ path, mode: 'lockfile', source: 'scripts/lib/pin-ranges.mjs', content: `${JSON.stringify(lock, null, 2)}\n` }));
  return { lockFiles, notes };
}

export function renderBody({ target, centralSha, changes, deletions, keptRemoved, pinNotes, packageNotes }) {
  const short = centralSha.slice(0, 7);
  const app = target.profile === 'app';
  const changed = (p) => changes.some((c) => c.path === p);
  const rows = changes.map((c) => `| \`${c.path}\` | ${c.isNew ? '추가' : '수정'} | ${c.source ? `\`${c.source}\`` : ''} |`);
  rows.push(...deletions.map((p) => `| \`${p}\` | 삭제 | 중앙에서 더 이상 관리하지 않음 |`));
  const confirm = [];
  if (app) confirm.push('- [ ] 이 리포의 main 병합은 곧 운영 배포입니다. 배포해도 되는 시점인지 확인했다');
  if (changes.some((c) => c.mode === 'lockfile' || c.path.endsWith('package.json'))) confirm.push('- [ ] `package.json`·lockfile 변경을 확인했다. 새 `@sirloinbh/*` 패키지가 추가됐다면 `npm install --ignore-scripts`로 lockfile을 다시 만들어 이 브랜치에 커밋한다(사용자 승인 필요)');
  if (changes.some((c) => c.path.endsWith('.npmrc'))) confirm.push('- [ ] `.npmrc`의 `${NODE_AUTH_TOKEN}` 줄 때문에, 이 환경변수가 없으면 npm 명령이 실패한다. 로컬과 서버에 설정했다(값은 `read:packages` 권한 토큰, 패키지를 쓰지 않으면 빈 값)');
  if (changes.some((c) => /^(frontend|backend|database)\//.test(c.path))) confirm.push('- [ ] `frontend/`·`backend/`·`database/` 아래 파일이 바뀌었다. 병합 후 subtree 배포 리포에 반영하려면 `scripts/push-repositories.ps1`을 실행한다');
  if (changed('AGENTS.md')) confirm.push('- [ ] 이 프로젝트만의 규칙이 `AGENTS.md`에서 사라지지 않았는지 확인했다. 필요하면 `AGENTS.project.md`로 옮긴다');
  if (keptRemoved.length) confirm.push(...keptRemoved.map((p) => `- [ ] \`${p}\`는 중앙 관리에서 빠졌지만 이 리포에서 수정된 상태라 지우지 않았다. 필요 없으면 직접 지운다`));
  if (!confirm.length) confirm.push('- 없음');
  const infra = target.profile === 'infra' ? ['', '이 PR은 `.tf` 파일을 바꾸지 않으며 terraform apply를 일으키지 않습니다.'] : [];
  return [
    '## 무엇을 바꿨나요',
    `중앙 표준 리포 \`${CENTRAL}\`의 커밋 \`${short}\`에 맞춰 중앙 관리 파일 ${changes.length + deletions.length}개를 동기화합니다.`,
    ...infra,
    '',
    '## 왜 바꿨나요',
    `- 중앙 리포 main이 바뀌었습니다: https://github.com/${CENTRAL}/commit/${centralSha}`,
    '- 이 PR은 중앙의 동기화 워크플로가 자동으로 만들었습니다. 내용을 바꾸려면 이 리포가 아니라 중앙 리포를 고칩니다.',
    '',
    '## 주요 변경',
    '| 파일 | 변경 | 중앙 원본 |',
    '|---|---|---|',
    ...rows,
    ...(pinNotes.length ? ['', '범위 버전 고정(설치된 버전 그대로, lockfile 기준):', ...pinNotes.map((n) => `- ${n}`)] : []),
    ...(packageNotes.length ? ['', '공유 패키지 출처 확인(ADR-0004):', ...packageNotes.map((n) => `- ${n}`)] : []),
    '',
    '## 확인한 내용',
    '- 이 리포의 CI(`standards-check` 포함) 결과를 확인합니다.',
    '',
    '## 병합 전에 확인해 주세요',
    ...confirm,
    '',
    '## 영향 범위',
    app ? '- 병합하면 운영 서버가 CI 통과 후 자동 배포할 수 있습니다.' : '- 인프라 리소스에는 영향이 없습니다.',
    '',
  ].join('\n');
}

/**
 * Plans and pushes one target. `api` is a GitHub client for the target; `centralApi` reads
 * central releases for package provenance. Returns { status, pr?, changes, deletions }.
 */
export async function syncTarget({ root, data, target, centralSha, workflowSha = centralSha, api, centralApi = null }) {
  const [owner, name] = target.repo.split('/');
  const repoPath = `/repos/${owner}/${name}`;
  const repo = await api('GET', repoPath);
  if (!repo) throw new Error(`${target.repo} not found or not accessible to the App`);
  const baseRef = await api('GET', `${repoPath}/git/ref/heads/${repo.default_branch}`);
  const baseSha = baseRef.object.sha;
  const baseCommit = await api('GET', `${repoPath}/git/commits/${baseSha}`);
  const tree = await api('GET', `${repoPath}/git/trees/${baseCommit.tree.sha}?recursive=1`);
  const blobs = new Map(tree.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));

  const cache = new Map();
  const fetchText = async (path) => {
    if (!cache.has(path)) {
      const sha = blobs.get(path);
      cache.set(path, sha ? Buffer.from((await api('GET', `${repoPath}/git/blobs/${sha}`)).content, 'base64').toString('utf8') : null);
    }
    return cache.get(path);
  };
  // planTarget reads synchronously, so download what it may need first.
  const index = loadIndex(root);
  const needed = [...index.section, ...Object.keys(index.fields[target.profile] ?? {}), MANIFEST_PATH, ...PACKAGE_FILES.flatMap(([, locks]) => locks.map(([p]) => p))];
  await Promise.all(needed.map(fetchText));
  const read = (p) => cache.get(p) ?? null;

  const plan = planTarget({ root, data, target, centralSha, workflowSha, readExisting: read });
  const packageNotes = centralApi ? await verifyPackages(plan.manifest.packages, centralApi) : [];
  const { lockFiles, notes: pinNotes } = target.profile === 'app' ? pinPackageFiles(plan.files, read) : { lockFiles: [], notes: [] };
  const all = [...plan.files, ...lockFiles];

  const changes = all
    .filter((f) => f.content !== undefined && gitBlobSha(f.content) !== blobs.get(f.path))
    .map((f) => ({ path: f.path, mode: f.mode, source: f.source, content: f.content, isNew: !blobs.has(f.path) }));

  // Files the previous sync managed but the central repository no longer does: delete only if untouched.
  const previous = read(MANIFEST_PATH) ? JSON.parse(read(MANIFEST_PATH)) : { files: {} };
  const deletions = [];
  const keptRemoved = [];
  for (const [path, entry] of Object.entries(previous.files ?? {})) {
    if (plan.manifest.files[path] || !blobs.has(path) || entry.mode === 'fields') continue;
    if (checkEntry(entry, await fetchText(path)) === null) deletions.push(path);
    else keptRemoved.push(path);
  }

  // Only the central SHA in the manifest changed: nothing to propose. A manifest that lists other
  // files, packages or registry values is proposed even when every file already matches (#234).
  const meaningful = changes.filter((c) => c.path !== MANIFEST_PATH);
  const withoutSha = (manifest) => JSON.stringify({ ...manifest, centralSha: null });
  const manifestMoved = withoutSha(previous) !== withoutSha(plan.manifest);
  if (!meaningful.length && !deletions.length && !manifestMoved) return { status: 'unchanged', changes: [], deletions: [] };

  const newTree = await api('POST', `${repoPath}/git/trees`, {
    base_tree: baseCommit.tree.sha,
    tree: [
      ...changes.map((c) => ({ path: c.path, mode: '100644', type: 'blob', content: c.content })),
      ...deletions.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
    ],
  });
  const short = centralSha.slice(0, 7);
  const commit = await api('POST', `${repoPath}/git/commits`, {
    message: `chore: 중앙 표준 동기화 (project-standards@${short})\n\n- 왜: 중앙 표준 리포 main이 바뀌었다\n- 변경: 중앙 관리 파일 ${changes.length + deletions.length}개`,
    tree: newTree.sha,
    parents: [baseSha],
  });

  const pulls = await api('GET', `${repoPath}/pulls?state=open&per_page=100`);
  const existing = pulls.find((p) => p.head.ref.startsWith(BRANCH_PREFIX) && p.head.repo?.full_name === target.repo);
  const branch = existing ? existing.head.ref : `${BRANCH_PREFIX}${short}`;
  if (existing || (await api('GET', `${repoPath}/git/ref/heads/${branch}`))) {
    await api('PATCH', `${repoPath}/git/refs/heads/${branch}`, { sha: commit.sha, force: true });
  } else {
    await api('POST', `${repoPath}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
  }
  const title = `chore: 중앙 표준 동기화 (project-standards@${short})`;
  const body = renderBody({ target, centralSha, changes: meaningful, deletions, keptRemoved, pinNotes, packageNotes });
  const pr = existing
    ? await api('PATCH', `${repoPath}/pulls/${existing.number}`, { title, body })
    : await api('POST', `${repoPath}/pulls`, { title, head: branch, base: repo.default_branch, body });
  return { status: existing ? 'updated' : 'opened', pr: pr.html_url, branch, changes: meaningful, deletions };
}

/** ADR-0004: a shared package version is trusted only if publish.yml released it from a tag. */
export async function verifyPackages(packages, centralApi) {
  const notes = [];
  for (const [pkg, version] of Object.entries(packages ?? {})) {
    if (!version) continue;
    const tag = `${pkg.replace('@sirloinbh/', '')}/v${version}`;
    const release = await centralApi('GET', `/repos/${CENTRAL}/releases/tags/${encodeURIComponent(tag)}`);
    if (!release) throw new Error(`${pkg}@${version}: no release for tag ${tag}; publish it with publish.yml first`);
    const runId = /actions\/runs\/(\d+)/.exec(release.body ?? '')?.[1];
    if (!runId) throw new Error(`${pkg}@${version}: release ${tag} has no publish run link`);
    const run = await centralApi('GET', `/repos/${CENTRAL}/actions/runs/${runId}`);
    if (run?.path !== '.github/workflows/publish.yml' || run?.conclusion !== 'success') throw new Error(`${pkg}@${version}: run ${runId} is not a successful publish.yml run`);
    notes.push(`${pkg}@${version}: 태그 \`${tag}\`, 배포 실행 ${run.html_url} (성공)`);
  }
  return notes;
}
