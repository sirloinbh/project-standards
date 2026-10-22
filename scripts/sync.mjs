// Sync central templates into project repositories.
// Usage:
//   node scripts/sync.mjs --dry-run --out <folder> [--target <owner/repo>]... [--local <repo-name>=<checkout>]... [--sha <commit>]
// --dry-run writes what each target would receive into <folder>/<repo-name>/ plus <folder>/plan.json.
// --local reads a local checkout so project sections and package.json fields merge with real files.
//   node scripts/sync.mjs --apply
// --apply (sync workflow only) opens or updates sync PRs for targets within maxRollout, using the
// GitHub App credentials in SYNC_APP_ID and SYNC_APP_PRIVATE_KEY.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, getInstallationToken } from './lib/github-app.mjs';
import { loadAll } from './lib/registry.mjs';
import { planTarget } from './lib/sync-plan.mjs';
import { syncTarget } from './lib/sync-pr.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Last central commit (at or before `sha`) that changed a reusable workflow; CI callers pin to it. */
export function lastWorkflowCommit(sha) {
  const out = execFileSync('git', ['log', '-1', '--format=%H', sha, '--', '.github/workflows/reusable-app-ci.yml', '.github/workflows/reusable-infra-ci.yml'], { cwd: root, encoding: 'utf8' }).trim();
  if (!out) throw new Error('could not find the commit that last changed the reusable workflows (is the checkout shallow?)');
  return out;
}

function parseArgs(argv) {
  const args = { dryRun: false, out: null, targets: [], local: {}, sha: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--target') args.targets.push(argv[++i]);
    else if (a === '--sha') args.sha = argv[++i];
    else if (a === '--local') {
      const [name, dir] = argv[++i].split('=');
      args.local[name] = path.resolve(dir);
    } else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

const readerFor = (dir) => (rel) => {
  if (!dir) return null;
  const file = path.join(dir, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};

export function dryRun({ data, targets, local, out, centralSha, workflowSha = centralSha }) {
  const summary = [];
  for (const target of targets) {
    const name = target.repo.split('/')[1];
    const plan = planTarget({ root, data, target, centralSha, workflowSha, readExisting: readerFor(local[name]) });
    const dir = path.join(out, name);
    for (const f of plan.files) {
      fs.mkdirSync(path.dirname(path.join(dir, f.path)), { recursive: true });
      fs.writeFileSync(path.join(dir, f.path), f.content);
    }
    summary.push({
      repo: target.repo,
      profile: target.profile,
      rollout: target.rollout,
      inRollout: plan.inRollout,
      localCheckout: Boolean(local[name]),
      files: plan.files.map((f) => ({ path: f.path, mode: f.mode, source: f.source })),
      skipped: plan.skipped,
      fieldsPending: plan.fieldsPending,
    });
  }
  fs.writeFileSync(path.join(out, 'plan.json'), `${JSON.stringify({ centralSha, maxRollout: data.sync.maxRollout, targets: summary }, null, 2)}\n`);
  return summary;
}

/**
 * Opens or updates sync PRs for targets within maxRollout. `getToken(repo)` returns an installation
 * token. With no target in rollout it only checks that a token can be issued (docs/github-app.md step 5).
 */
export async function apply({ data, targets, centralSha, workflowSha = centralSha, getToken, makeClient, log = console.log }) {
  const inRollout = targets.filter((t) => t.rollout <= data.sync.maxRollout);
  if (!inRollout.length) {
    await getToken('sirloinbh/project-standards');
    log(`설치 토큰 발급 확인. maxRollout ${data.sync.maxRollout}이라 동기화할 대상이 없습니다.`);
    return [];
  }
  const centralApi = makeClient(await getToken('sirloinbh/project-standards'));
  const results = [];
  for (const target of inRollout) {
    try {
      const api = makeClient(await getToken(target.repo));
      const result = await syncTarget({ root, data, target, centralSha, workflowSha, api, centralApi });
      log(`${target.repo}: ${result.status}${result.pr ? ` ${result.pr}` : ''} (변경 ${result.changes.length}, 삭제 ${result.deletions.length})`);
      results.push({ target: target.repo, ...result });
    } catch (error) {
      log(`${target.repo}: 실패 — ${error.message}`);
      results.push({ target: target.repo, status: 'failed', error: error.message });
    }
  }
  return results;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--apply')) {
  const { data } = loadAll(root);
  const centralSha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const credentials = { appId: process.env.SYNC_APP_ID, privateKey: process.env.SYNC_APP_PRIVATE_KEY };
  apply({
    data,
    targets: data.sync.targets,
    centralSha,
    workflowSha: lastWorkflowCommit(centralSha),
    getToken: async (repo) => (await getInstallationToken({ ...credentials, repo })).token,
    makeClient: (token) => createClient({ token }),
  })
    .then((results) => process.exit(results.some((r) => r.status === 'failed') ? 1 : 0))
    .catch((error) => {
      console.error(`sync: ${error.message}`);
      process.exit(1);
    });
} else if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.dryRun) throw new Error('use --dry-run --out <folder> to preview, or --apply in the sync workflow');
    if (!args.out) throw new Error('--dry-run needs --out <folder>');
    const { data } = loadAll(root);
    const targets = args.targets.length ? data.sync.targets.filter((t) => args.targets.includes(t.repo)) : data.sync.targets;
    if (args.targets.length && targets.length !== args.targets.length) throw new Error(`unknown target in ${args.targets.join(', ')}`);
    const centralSha = args.sha ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    fs.mkdirSync(args.out, { recursive: true });
    for (const t of dryRun({ data, targets, local: args.local, out: path.resolve(args.out), centralSha, workflowSha: args.sha ? args.sha : lastWorkflowCommit(centralSha) })) {
      const note = [t.inRollout ? '적용 대상' : `대기(rollout ${t.rollout})`, t.skipped.length && `건너뜀 ${t.skipped.length}`, t.fieldsPending.length && `필드 미병합 ${t.fieldsPending.length}`].filter(Boolean).join(', ');
      console.log(`${t.repo}: 파일 ${t.files.length}개 — ${note}`);
    }
    console.log(`결과: ${path.resolve(args.out)}`);
  } catch (error) {
    console.error(`sync: ${error.message}`);
    process.exit(1);
  }
}
