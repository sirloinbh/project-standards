// Checks the shared packages in packages/* against the supply-chain rules (ADR-0004):
// no dependencies, no install scripts, exact versions, a CHANGELOG entry, GitHub Packages only.
// Usage: node scripts/package-guard.mjs [--tag <package>/v<version>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare'];
const EXACT = /^\d+\.\d+\.\d+$/;
const REGISTRY = 'https://npm.pkg.github.com';

/** Returns a list of problems for one package folder. */
export function checkPackage(dir) {
  const problems = [];
  const name = path.basename(dir);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const say = (message) => problems.push(`packages/${name}: ${message}`);

  if (pkg.name !== `@sirloinbh/${name}`) say(`name must be @sirloinbh/${name}`);
  if (!EXACT.test(pkg.version ?? '')) say(`version must be an exact x.y.z, got ${pkg.version}`);
  if (pkg.private) say('must not be private (it is published)');
  for (const field of ['dependencies', 'optionalDependencies', 'bundleDependencies', 'bundledDependencies']) {
    if (pkg[field] && Object.keys(pkg[field]).length) say(`${field} must be empty`);
  }
  for (const s of INSTALL_SCRIPTS) if (pkg.scripts?.[s]) say(`install script "${s}" is not allowed`);
  for (const [peer, range] of Object.entries(pkg.peerDependencies ?? {})) {
    if (!EXACT.test(range)) say(`peerDependency ${peer} must be pinned exactly, got ${range}`);
  }
  if (pkg.publishConfig?.registry !== REGISTRY) say(`publishConfig.registry must be ${REGISTRY}`);
  if (!pkg.repository?.url?.includes('sirloinbh/project-standards')) say('repository must point to sirloinbh/project-standards');
  if (!Array.isArray(pkg.files) || !pkg.files.length) say('files must list what is published');
  else for (const f of pkg.files) if (!fs.existsSync(path.join(dir, f))) say(`files lists ${f}, which does not exist`);

  const changelog = path.join(dir, 'CHANGELOG.md');
  if (!fs.existsSync(changelog)) say('CHANGELOG.md is missing');
  else if (!fs.readFileSync(changelog, 'utf8').includes(`\n## ${pkg.version}\n`)) say(`CHANGELOG.md has no "## ${pkg.version}" entry`);
  return problems;
}

/** Checks a release tag such as "eslint-config/v1.0.0" against the package version. */
export function checkTag(root, tag) {
  const match = /^([a-z][a-z0-9-]*)\/v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!match) return [`tag ${tag} must look like <package>/v<x.y.z>`];
  const [, name, version] = match;
  const file = path.join(root, 'packages', name, 'package.json');
  if (!fs.existsSync(file)) return [`tag ${tag}: packages/${name} does not exist`];
  const actual = JSON.parse(fs.readFileSync(file, 'utf8')).version;
  return actual === version ? [] : [`tag ${tag}: packages/${name} is version ${actual}`];
}

export function checkAll(root) {
  const base = path.join(root, 'packages');
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => checkPackage(path.join(base, e.name)));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const tagAt = process.argv.indexOf('--tag');
  const problems = [...checkAll(root), ...(tagAt > 0 ? checkTag(root, process.argv[tagAt + 1]) : [])];
  for (const p of problems) console.error(`error: ${p}`);
  if (problems.length) process.exit(1);
  console.log('package-guard: ok');
}
