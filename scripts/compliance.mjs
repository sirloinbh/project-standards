// Writes docs/compliance.md and docs/env-matrix.md.
// Usage:
//   node scripts/compliance.mjs --local <repo-name>=<checkout> ...   preview from local clones
//   node scripts/compliance.mjs --apply                              compliance workflow (GitHub App)
// --apply reads every sync target through the API and, if the reports changed, opens or updates
// the PR "chore/compliance-report" in the central repository.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCompliance, renderEnvMatrix, repoStatus } from './lib/compliance.mjs';
import { createClient, getInstallationToken } from './lib/github-app.mjs';
import { MANIFEST_PATH } from './lib/manifest.mjs';
import { loadAll } from './lib/registry.mjs';
import { openRemote } from './lib/remote-repo.mjs';
import { collectSettings, evaluateSettings } from './lib/repo-settings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CENTRAL = 'sirloinbh/project-standards';
const REPORT_BRANCH = 'chore/compliance-report';
const OUTPUTS = ['docs/compliance.md', 'docs/env-matrix.md'];

// The generated-at comment changes every run; compare reports without it.
export const withoutStamp = (text) => text.replace(/<!-- 자동 생성 파일[^>]*-->/g, '');

export function renderReports(statuses, meta) {
  return { 'docs/compliance.md': renderCompliance(statuses, meta), 'docs/env-matrix.md': renderEnvMatrix(statuses, meta) };
}

const projectOf = (data, target) => data.projects.projects.find((p) => p.name === target.project);

function localStatuses(data, local, now) {
  return data.sync.targets.map((target) => {
    const dir = local[target.repo.split('/')[1]];
    if (!dir) return { repo: target.repo, profile: target.profile, unknown: '로컬 클론 없음' };
    const read = (rel) => (fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel), 'utf8') : null);
    return repoStatus({ target, project: projectOf(data, target), read, now });
  });
}

export async function remoteStatuses({ data, getClient, now = new Date() }) {
  const statuses = [];
  for (const target of data.sync.targets) {
    try {
      const api = await getClient(target.repo);
      const repo = await openRemote(api, target.repo);
      await repo.fetchText(MANIFEST_PATH);
      const manifest = repo.read(MANIFEST_PATH) ? JSON.parse(repo.read(MANIFEST_PATH)) : { files: {} };
      await Promise.all([...Object.keys(manifest.files ?? {}), '.env.example', 'package.json'].map(repo.fetchText));
      const pulls = await api('GET', `/repos/${target.repo}/pulls?state=open&per_page=100`);
      const status = repoStatus({ target, project: projectOf(data, target), read: repo.read, pulls, now });
      // Settings are judged separately so a missing permission only blanks this column (#22).
      try {
        status.settings = evaluateSettings(await collectSettings(api, target.repo), target);
      } catch (error) {
        status.settingsError = error.message;
      }
      statuses.push(status);
    } catch (error) {
      statuses.push({ repo: target.repo, profile: target.profile, unknown: error.message });
    }
  }
  return statuses;
}

/** Opens or updates the report PR in the central repository when the reports changed. */
export async function publishReports({ api, reports, centralSha }) {
  const repo = await openRemote(api, CENTRAL);
  await Promise.all(OUTPUTS.map(repo.fetchText));
  const changed = OUTPUTS.filter((p) => withoutStamp(repo.read(p) ?? '') !== withoutStamp(reports[p]));
  if (!changed.length) return { status: 'unchanged' };
  const tree = await api('POST', `/repos/${CENTRAL}/git/trees`, { base_tree: repo.treeSha, tree: changed.map((p) => ({ path: p, mode: '100644', type: 'blob', content: reports[p] })) });
  const commit = await api('POST', `/repos/${CENTRAL}/git/commits`, {
    message: `docs: 준수 현황 갱신 (project-standards@${centralSha.slice(0, 7)})\n\n- 왜: 하위 리포 상태가 바뀌었다\n- 변경: ${changed.join(', ')}`,
    tree: tree.sha,
    parents: [repo.baseSha],
  });
  const exists = await api('GET', `/repos/${CENTRAL}/git/ref/heads/${REPORT_BRANCH}`);
  if (exists) await api('PATCH', `/repos/${CENTRAL}/git/refs/heads/${REPORT_BRANCH}`, { sha: commit.sha, force: true });
  else await api('POST', `/repos/${CENTRAL}/git/refs`, { ref: `refs/heads/${REPORT_BRANCH}`, sha: commit.sha });
  const pulls = await api('GET', `/repos/${CENTRAL}/pulls?state=open&per_page=100`);
  const open = pulls.find((p) => p.head.ref === REPORT_BRANCH);
  const title = 'docs: 준수 현황 갱신';
  const body = [
    '## 무엇을 바꿨나요',
    `하위 리포의 현재 상태로 ${changed.map((p) => `\`${p}\``).join(', ')}를 다시 만들었습니다.`,
    '',
    '## 왜 바꿨나요',
    '- 정기 실행(compliance.yml)에서 이전 보고서와 다른 내용이 나왔습니다.',
    '',
    '## 주요 변경',
    '| 파일 | 내용 |',
    '|---|---|',
    ...changed.map((p) => `| \`${p}\` | 자동 생성 |`),
    '',
    '## 확인한 내용',
    '- 보고서에는 비밀값이 들어가지 않습니다(키 이름과 설명만).',
    '',
    '## 병합 전에 확인해 주세요',
    '- 없음',
    '',
    '## 영향 범위',
    '- 없음. 문서만 바뀝니다.',
    '',
  ].join('\n');
  const pr = open
    ? await api('PATCH', `/repos/${CENTRAL}/pulls/${open.number}`, { title, body })
    : await api('POST', `/repos/${CENTRAL}/pulls`, { title, head: REPORT_BRANCH, base: repo.defaultBranch, body });
  return { status: open ? 'updated' : 'opened', pr: pr.html_url, changed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const { data } = loadAll(root);
  const now = new Date();
  const centralSha = process.env.GITHUB_SHA ?? 'local';
  const meta = { generatedAt: now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC', centralSha };
  const write = (reports) => {
    for (const [rel, text] of Object.entries(reports)) fs.writeFileSync(path.join(root, rel), text);
    console.log(`wrote ${Object.keys(reports).join(', ')}`);
  };
  if (args.includes('--apply')) {
    const credentials = { appId: process.env.SYNC_APP_ID, privateKey: process.env.SYNC_APP_PRIVATE_KEY };
    const getClient = async (repo) => createClient({ token: (await getInstallationToken({ ...credentials, repo })).token });
    remoteStatuses({ data, getClient, now })
      .then(async (statuses) => {
        const reports = renderReports(statuses, meta);
        write(reports);
        const result = await publishReports({ api: await getClient(CENTRAL), reports, centralSha });
        console.log(`compliance: ${result.status}${result.pr ? ` ${result.pr}` : ''}`);
      })
      .catch((error) => {
        console.error(`compliance: ${error.message}`);
        process.exit(1);
      });
  } else {
    const local = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== '--local') continue;
      const [name, dir] = args[++i].split('=');
      local[name] = path.resolve(dir);
    }
    write(renderReports(localStatuses(data, local, now), meta));
  }
}
