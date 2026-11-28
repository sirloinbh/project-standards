// Checks a design-system release against the apps before the pin moves (#1178, ADR-0031).
// Used by .github/workflows/design-system-release-check.yml on pull requests that change the `design-system` pin in versions.json:
//   node scripts/release-app-check.mjs --pin-changed <base-versions.json> <head-versions.json>   prints true or false
//   node scripts/release-app-check.mjs --matrix                                                  prints the app list as JSON for the job matrix
//   node scripts/release-app-check.mjs --verify-release                                          the pinned commit must have a green design-system `check`
//   node scripts/release-app-check.mjs --app <name> --work <folder>                              clones the app, renders this PR's sync files into it, then
//                                                                                                installs, checks the format, lints, typechecks and tests
// A failing app fails the pin PR, not the app sync PRs later. The reason (step and the end of its output) goes to the job summary.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDesignSystem } from './lib/design-system.mjs';
import { loadAll } from './lib/registry.mjs';
import { planTarget } from './lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAIL_LINES = 40;

/** True when the design-system pin differs between two versions.json texts and the head one names a version. */
export function pinChanged(baseText, headText) {
  const base = JSON.parse(baseText)['design-system'] ?? null;
  const head = JSON.parse(headText)['design-system'] ?? null;
  return Boolean(head?.version) && JSON.stringify(base) !== JSON.stringify(head);
}

/** Apps that receive the shared UI: [{ app, repo }] for every active project with features.ui. */
export function appMatrix(data) {
  return data.projects.projects.filter((p) => p.status === 'active' && p.features?.ui).map((p) => ({ app: p.name, repo: `sirloinbh/${p.repos.umbrella}` }));
}

/** Problems with the pinned release itself: the design-system `check` of the pinned commit must be green (its showcase tests run there, #1186). */
export async function verifyRelease({ pin, fetchImpl = fetch }) {
  if (!pin?.version) return ['the design-system pin has no version'];
  const response = await fetchImpl(`https://api.github.com/repos/${pin.repo}/commits/${pin.sha}/check-runs?per_page=100`, { headers: { accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) return [`could not read the checks of ${pin.repo}@${pin.sha.slice(0, 7)}: ${response.status}`];
  const { check_runs: runs } = await response.json();
  const check = runs.find((r) => r.name === 'check');
  if (!check) return [`${pin.repo}@${pin.sha.slice(0, 7)} has no \`check\` run`];
  return check.conclusion === 'success' ? [] : [`the \`check\` of ${pin.repo}@${pin.sha.slice(0, 7)} is ${check.conclusion ?? check.status}`];
}

const STEPS = [
  ['install', ['npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund']]],
  ['format check', ['npm', ['run', 'format:check']]],
  ['lint', ['npm', ['run', 'lint']]],
  ['frontend typecheck', ['npm', ['run', 'typecheck', '-w', 'frontend']]],
  ['frontend tests', ['npm', ['run', 'test', '-w', 'frontend']]],
];

function defaultRun(command, args, cwd) {
  const out = spawnSync(command, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
  return { ok: out.status === 0, output: `${out.stdout ?? ''}${out.stderr ?? ''}` };
}

function defaultClone(repo, dir) {
  const out = spawnSync('git', ['clone', '--quiet', '--depth', '1', `https://github.com/${repo}.git`, dir], { encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`could not clone ${repo}: ${out.stderr.trim()}`);
}

/**
 * Renders this checkout's sync files for one app into a fresh clone and runs the app steps (install, format check, lint, frontend typecheck and tests).
 * Returns { app, ok, step?, tail? }; `step` and `tail` (the end of the output) name why it failed.
 */
export function checkApp({ data, app, work, clone = defaultClone, run = defaultRun, centralSha = '0'.repeat(40) }) {
  const target = data.sync.targets.find((t) => t.project === app);
  if (!target) throw new Error(`unknown app: ${app}`);
  const dir = path.join(work, app);
  clone(target.repo, dir);
  const read = (rel) => (fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel), 'utf8') : null);
  const plan = planTarget({ root, data, target, centralSha, readExisting: read });
  for (const file of plan.files) {
    fs.mkdirSync(path.dirname(path.join(dir, file.path)), { recursive: true });
    fs.writeFileSync(path.join(dir, file.path), file.content);
  }
  for (const [step, [command, args]] of STEPS) {
    const result = run(command, args, dir);
    if (!result.ok) return { app, ok: false, step, tail: result.output.trim().split('\n').slice(-TAIL_LINES).join('\n') };
  }
  return { app, ok: true };
}

/** Markdown for the job summary. */
export function summary({ pin, result }) {
  const head = `### design-system v${pin.version} on ${result.app}: ${result.ok ? 'passed' : 'failed'}`;
  if (result.ok) return `${head}\n\nThe app installs, passes its format check and lint, typechecks, and passes its frontend tests with this release.\n`;
  return `${head}\n\nFailed at **${result.step}**. The end of its output:\n\n\`\`\`\n${result.tail}\n\`\`\`\n\nFix the release in design-system (or add the app change a major release needs) before the pin moves.\n`;
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const argv = process.argv.slice(2);
  const arg = (name) => argv[argv.indexOf(name) + 1];
  (async () => {
    if (argv[0] === '--pin-changed') {
      console.log(String(pinChanged(fs.readFileSync(argv[1], 'utf8'), fs.readFileSync(argv[2], 'utf8'))));
      return;
    }
    const { data } = loadAll(root);
    if (argv[0] === '--matrix') {
      console.log(JSON.stringify(appMatrix(data)));
    } else if (argv[0] === '--verify-release') {
      const problems = await verifyRelease({ pin: data.versions['design-system'] });
      for (const p of problems) console.error(`release-app-check: ${p}`);
      process.exit(problems.length ? 1 : 0);
    } else if (argv[0] === '--app') {
      // The PR's own release, fetched like the sync does, so the check sees exactly what the apps would get.
      data.designSystemRelease = resolveDesignSystem({ pin: data.versions['design-system'], cacheDir: path.join(root, '.local/design-system') });
      if (!data.designSystemRelease) throw new Error('the design-system pin has no version, so there is no release to check');
      const result = checkApp({ data, app: arg('--app'), work: path.resolve(arg('--work')) });
      const text = summary({ pin: data.versions['design-system'], result });
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
      console.log(text);
      process.exit(result.ok ? 0 : 1);
    } else {
      throw new Error('use --pin-changed, --matrix, --verify-release or --app <name> --work <folder>');
    }
  })().catch((error) => {
    console.error(`release-app-check: ${error.message}`);
    process.exit(1);
  });
}
