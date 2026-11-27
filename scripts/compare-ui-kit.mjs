// Proves that the UI kit in a design-system checkout renders to the same files for every app as templates/ui does (#1166).
// design-system keeps the kit as src/ and public/, which sync places at frontend/src/ and frontend/public/.
// Usage: node scripts/compare-ui-kit.mjs <path to the design-system checkout>
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/registry.mjs';
import { planTarget } from './lib/sync-plan.mjs';

// Kit files that do not move to design-system, relative to templates/ui/frontend: sign-in imports the private
// @sirloinbh/auth-client, and the service worker belongs to the PWA files of the app (docs/design-system-move.md A5).
export const STAYS = ['src/sign-in.tsx', 'src/service-worker.ts', 'src/service-worker.test.tsx'];

const KIT_FOLDERS = ['src', 'public'];
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const posix = (p) => p.split(path.sep).join('/');

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name), base) : [posix(path.relative(base, path.join(dir, e.name)))]));
}

/** The kit files of a design-system checkout: what git tracks under src/ and public/, without stories. */
export function trackedKitFiles(designSystemDir) {
  const out = execFileSync('git', ['ls-files', '-z', '--', ...KIT_FOLDERS], { cwd: designSystemDir, encoding: 'utf8' });
  return out
    .split('\0')
    .filter(Boolean)
    .filter((f) => !/\.stories\.[a-z]+$/.test(f));
}

/**
 * Renders the plan of every ui app twice, once from templates/ui and once from the kit in `designSystemDir`, and lists the differences.
 * `files` overrides the list of kit files (the tests use it; the command line uses git).
 */
export function compareUiKit({ root, designSystemDir, files = trackedKitFiles(designSystemDir) }) {
  const { data } = loadAll(root);
  const problems = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-kit-compare-'));
  try {
    // The whole repository, because sync also reads the scripts and security files it vendors into the apps.
    fs.cpSync(root, tmp, { recursive: true, filter: (src) => !['.git', 'node_modules', '.local'].includes(path.basename(src)) });
    const kit = path.join(tmp, 'templates/ui/frontend');
    const sourceFiles = walk(kit);
    for (const f of sourceFiles) if (!files.includes(f) && !STAYS.includes(f)) problems.push(`design-system does not have ${f} (and it is not in STAYS)`);
    for (const f of STAYS) if (files.includes(f)) problems.push(`${f} is in STAYS but design-system has it too`);
    for (const f of files) if (!sourceFiles.includes(f)) problems.push(`design-system has ${f}, which templates/ui does not`);
    // Replace the moved files with the design-system copy; the files that stay keep their project-standards copy.
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(kit, f)), { recursive: true });
      fs.copyFileSync(path.join(designSystemDir, f), path.join(kit, f));
    }
    const centralSha = 'a'.repeat(40);
    let apps = 0;
    for (const target of data.sync.targets.filter((t) => t.project && t.enabled !== false)) {
      if (!data.projects.projects.find((p) => p.name === target.project)?.features?.ui) continue;
      apps += 1;
      const before = new Map(planTarget({ root, data, target, centralSha }).files.map((f) => [f.path, f]));
      const after = new Map(planTarget({ root: tmp, data, target, centralSha }).files.map((f) => [f.path, f]));
      for (const [file, a] of before) {
        const b = after.get(file);
        if (!b) problems.push(`${target.project}: ${file} is missing after the move`);
        else if (sha(a.content) !== sha(b.content)) problems.push(`${target.project}: ${file} differs`);
      }
      for (const file of after.keys()) if (!before.has(file)) problems.push(`${target.project}: ${file} is new after the move`);
    }
    if (apps === 0) problems.push('no app has features.ui, so nothing was compared');
    return { apps, files: files.length, problems };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/compare-ui-kit.mjs <path to the design-system checkout>');
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = compareUiKit({ root, designSystemDir: path.resolve(dir) });
  for (const p of result.problems) console.error(`error: ${p}`);
  if (result.problems.length) process.exit(1);
  console.log(`compare-ui-kit: ${result.files} kit files render the same for ${result.apps} apps`);
}
