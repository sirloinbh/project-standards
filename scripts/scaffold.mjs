// Renders a new app repository for a project that is already in the registry and sync.config.json:
// the project-owned starting files (scaffold/app), the operations docs (docs/runbooks), the contract
// copies, and the centrally managed files exactly as the first sync would write them.
// Usage: node scripts/scaffold.mjs <project> --out <new or empty folder>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/registry.mjs';
import { renderText } from './lib/render.mjs';
import { planTarget } from './lib/sync-plan.mjs';
import { TEMPLATE_SUFFIX } from './lib/templates.mjs';
import { buildVars } from './lib/vars.mjs';
import { lastWorkflowCommit } from './sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** docs/runbooks template → path in the app repository (docs/runbooks/README.md). */
export const RUNBOOKS = {
  'deploy.md': 'docs/deployment.md',
  'backup-restore.md': 'docs/backup-restore.md',
  'daily.md': 'docs/daily/README.md',
  'next-steps.md': 'docs/next-steps/README.md',
};
export const CONTRACT_COPIES = ['backend/src/contract.ts', 'frontend/src/contract.ts'];

function walk(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink in scaffold requires inspection: ${full}`);
      return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
    })
    .sort();
}

/** Own package versions for templates: packages/eslint-config → packages.eslintConfig. */
export function packageVars(centralRoot) {
  const dir = path.join(centralRoot, 'packages');
  return Object.fromEntries(
    fs.readdirSync(dir).map((name) => {
      const { version } = JSON.parse(fs.readFileSync(path.join(dir, name, 'package.json'), 'utf8'));
      return [name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), version];
    }),
  );
}

/** Returns [{ path, content }] for the whole first commit of the project's umbrella repository. */
export function renderScaffold({ root: centralRoot = root, data, project, centralSha, workflowSha = centralSha }) {
  const target = data.sync.targets.find((t) => t.project === project && t.profile === 'app');
  if (!target) throw new Error(`${project}: no app target in sync.config.json. Add the project to the registry and sync.config.json first (docs/design.md 6.6).`);
  const vars = { ...buildVars(data, target, { centralSha, workflowSha }), packages: packageVars(centralRoot) };

  const own = new Map();
  const scaffoldDir = path.join(centralRoot, 'scaffold/app');
  for (const rel of walk(scaffoldDir)) {
    const out = rel.endsWith(TEMPLATE_SUFFIX) ? rel.slice(0, -TEMPLATE_SUFFIX.length) : rel;
    own.set(out, renderText(fs.readFileSync(path.join(scaffoldDir, rel), 'utf8').replace(/\r\n/g, '\n'), vars, `scaffold/app/${rel}`));
  }
  for (const [file, out] of Object.entries(RUNBOOKS)) {
    own.set(out, renderText(fs.readFileSync(path.join(centralRoot, 'docs/runbooks', file), 'utf8').replace(/\r\n/g, '\n'), vars, `docs/runbooks/${file}`));
  }
  for (const copy of CONTRACT_COPIES) own.set(copy, own.get('shared/contract.ts'));

  const plan = planTarget({ root: centralRoot, data, target, centralSha, workflowSha, readExisting: (p) => own.get(p) ?? null });
  if (plan.fieldsPending.length) throw new Error(`scaffold/app is missing ${plan.fieldsPending.join(', ')} (managed fields need the file)`);
  for (const file of plan.files) own.set(file.path, file.content);
  return [...own].map(([file, content]) => ({ path: file, content })).sort((a, b) => a.path.localeCompare(b.path));
}

export function writeScaffold(files, out) {
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${out} is not empty`);
  for (const file of files) {
    const full = path.join(out, file.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, file.content);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [project] = process.argv.slice(2);
  const flag = process.argv.indexOf('--out');
  if (!project || project.startsWith('--') || flag < 0 || !process.argv[flag + 1]) {
    console.error('Usage: node scripts/scaffold.mjs <project> --out <new or empty folder>');
    process.exit(2);
  }
  const centralSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const { data } = loadAll(root);
  const files = renderScaffold({ data, project, centralSha, workflowSha: lastWorkflowCommit(centralSha) });
  const out = path.resolve(process.argv[flag + 1]);
  writeScaffold(files, out);
  console.log(`${files.length} files written to ${out}`);
  console.log('Next: README "새 프로젝트 추가" in sirloinbh/project-standards (git init, first commit, dependency install with user approval).');
}
