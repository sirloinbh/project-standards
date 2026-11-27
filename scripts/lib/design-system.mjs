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
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(cacheDir, { recursive: true });
    try {
      git(['clone', '--quiet', '--depth', '1', '--branch', tag, cloneUrl(pin.repo), dir]);
    } catch (error) {
      fs.rmSync(dir, { recursive: true, force: true });
      throw new Error(`could not fetch ${pin.repo} ${tag}: ${String(error.stderr || error.message).trim()}`);
    }
  }
  const actual = git(['rev-parse', 'HEAD'], dir);
  if (actual !== pin.sha) {
    throw new Error(`${pin.repo} ${tag} is at ${actual}, but versions.json pins ${pin.sha}. The tag moved or the pin is wrong`);
  }
  for (const folder of DELIVERED_FOLDERS) {
    if (!fs.existsSync(path.join(dir, DELIVERY_FOLDER, folder))) throw new Error(`${pin.repo} ${tag} has no ${DELIVERY_FOLDER}/${folder}/ folder`);
  }
  return { version: pin.version, tag, sha: actual, dir };
}

/** { folder: { dir, label } } for collectTemplates; empty without a release (fallback to templates/). */
export function externalFolders(release) {
  if (!release) return {};
  return Object.fromEntries(DELIVERED_FOLDERS.map((folder) => [folder, { dir: path.join(release.dir, DELIVERY_FOLDER, folder), label: `design-system/${DELIVERY_FOLDER}/${folder}` }]));
}
