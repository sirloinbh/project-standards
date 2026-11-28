// Fetches the pinned design-system release that sync delivers (ADR-0031, #1171).
// versions.json key "design-system": { repo, version, sha }. version null means no release exists yet, so sync keeps
// using the copy in templates/ (the fallback). With a version, the folder `delivery/<feature folder>/` of that release
// replaces templates/<feature folder>/ (today only `ui`).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const DELIVERY_FOLDER = 'delivery';
/** Feature folders (sync.config.json featureTemplates values) that design-system delivers once a release is pinned. */
export const DELIVERED_FOLDERS = ['ui'];
/**
 * Vendored central files (templates/index.json vendor.files sources) that the release delivers instead of the local copy (#1169):
 * source path in this repository -> path in the release. The local file is the fallback until the first release is pinned.
 */
export const DELIVERED_VENDORED = { 'scripts/lib/screen-checks.mjs': `${DELIVERY_FOLDER}/standards/screen-checks.mjs` };

const defaultCloneUrl = (repo) => `https://github.com/${repo}.git`;
const run = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/**
 * Returns { version, tag, sha, dir } for the pinned release, or null while the pin has no version.
 * The release is cloned once per tag into `cacheDir/<version>` (a cached copy is reused after its commit is checked
 * again). Throws a clear error when the pin is malformed, the fetch fails, or the tag no longer points at the pinned commit.
 */
export function resolveDesignSystem({ pin, cacheDir, cloneUrl = defaultCloneUrl, git = run }) {
  if (!pin) throw new Error('versions.json: the "design-system" pin is missing');
  if (pin.version === null || pin.version === undefined) return null;
  if (!pin.sha) throw new Error(`versions.json: design-system ${pin.version} has no "sha" (the commit the tag v${pin.version} must point at)`);
  const tag = `v${pin.version}`;
  const dir = path.join(cacheDir, pin.version);
  if (!fs.existsSync(path.join(dir, '.git'))) {
    // Clone beside the target and rename, so parallel test processes that need the same release never share a half-made folder.
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(cacheDir, { recursive: true });
    const temp = `${dir}.tmp-${process.pid}-${Date.now()}`;
    try {
      git(['clone', '--quiet', '--depth', '1', '--branch', tag, cloneUrl(pin.repo), temp]);
    } catch (error) {
      fs.rmSync(temp, { recursive: true, force: true });
      throw new Error(`could not fetch ${pin.repo} ${tag}: ${String(error.stderr || error.message).trim()}`);
    }
    try {
      fs.renameSync(temp, dir);
    } catch (error) {
      fs.rmSync(temp, { recursive: true, force: true });
      if (!fs.existsSync(path.join(dir, '.git'))) throw error; // another process won the race: use its copy
    }
  }
  const actual = git(['rev-parse', 'HEAD'], dir);
  if (actual !== pin.sha) {
    throw new Error(`${pin.repo} ${tag} is at ${actual}, but versions.json pins ${pin.sha}. The tag moved or the pin is wrong`);
  }
  for (const folder of DELIVERED_FOLDERS) {
    if (!fs.existsSync(path.join(dir, DELIVERY_FOLDER, folder))) throw new Error(`${pin.repo} ${tag} has no ${DELIVERY_FOLDER}/${folder}/ folder`);
  }
  for (const file of Object.values(DELIVERED_VENDORED)) {
    if (!fs.existsSync(path.join(dir, file))) throw new Error(`${pin.repo} ${tag} has no ${file}`);
  }
  return { version: pin.version, tag, sha: actual, dir };
}

/** { folder: { dir, label } } for collectTemplates; empty without a release (fallback to templates/). */
export function externalFolders(release) {
  if (!release) return {};
  return Object.fromEntries(DELIVERED_FOLDERS.map((folder) => [folder, { dir: path.join(release.dir, DELIVERY_FOLDER, folder), label: `design-system/${DELIVERY_FOLDER}/${folder}` }]));
}

/** { source path: { file, label } } for renderProfile's vendored files; empty without a release (fallback to the local copies). */
export function externalVendored(release) {
  if (!release) return {};
  return Object.fromEntries(Object.entries(DELIVERED_VENDORED).map(([source, rel]) => [source, { file: path.join(release.dir, rel), label: `design-system/${rel}` }]));
}
