// Sync central templates into project repositories.
// Usage:
//   node scripts/sync.mjs --dry-run --out <folder> [--target <owner/repo>]... [--local <repo-name>=<checkout>]... [--sha <commit>]
// --dry-run writes what each target would receive into <folder>/<repo-name>/ plus <folder>/plan.json.
// --local reads a local checkout so project sections and package.json fields merge with real files.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/registry.mjs';
import { planTarget } from './lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

export function dryRun({ data, targets, local, out, centralSha }) {
  const summary = [];
  for (const target of targets) {
    const name = target.repo.split('/')[1];
    const plan = planTarget({ root, data, target, centralSha, readExisting: readerFor(local[name]) });
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.dryRun) throw new Error('only --dry-run is available yet; opening PRs comes with #63');
    if (!args.out) throw new Error('--dry-run needs --out <folder>');
    const { data } = loadAll(root);
    const targets = args.targets.length ? data.sync.targets.filter((t) => args.targets.includes(t.repo)) : data.sync.targets;
    if (args.targets.length && targets.length !== args.targets.length) throw new Error(`unknown target in ${args.targets.join(', ')}`);
    const centralSha = args.sha ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    fs.mkdirSync(args.out, { recursive: true });
    for (const t of dryRun({ data, targets, local: args.local, out: path.resolve(args.out), centralSha })) {
      const note = [t.inRollout ? '적용 대상' : `대기(rollout ${t.rollout})`, t.skipped.length && `건너뜀 ${t.skipped.length}`, t.fieldsPending.length && `필드 미병합 ${t.fieldsPending.length}`].filter(Boolean).join(', ');
      console.log(`${t.repo}: 파일 ${t.files.length}개 — ${note}`);
    }
    console.log(`결과: ${path.resolve(args.out)}`);
  } catch (error) {
    console.error(`sync: ${error.message}`);
    process.exit(1);
  }
}
