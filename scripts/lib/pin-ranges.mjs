// Replaces ^/~ ranges in package.json with the exact version already installed per the lockfile,
// and updates the lockfile's recorded specs to match. Installed versions do not change, so the
// 14-day rule is not involved and `npm ci` keeps installing the same tree (design.md 8.3).

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/** Lockfile key of the installed package for a workspace (`frontend`) or the root (``). */
function installedVersion(lock, workspace, name) {
  const candidates = workspace ? [`${workspace}/node_modules/${name}`, `node_modules/${name}`] : [`node_modules/${name}`];
  for (const key of candidates) if (lock.packages?.[key]?.version) return lock.packages[key].version;
  return null;
}

/**
 * pkg: parsed package.json; lock: parsed lockfile; workspace: lockfile key of this package
 * ('' for the lockfile root, 'frontend' for a workspace in the root lockfile).
 * Returns { pkg, lock, changes: ["devDependencies.vite ^6.3.5 → 6.3.5"], unresolved: [...] }.
 */
export function pinRanges(pkg, lock, workspace = '') {
  const nextPkg = structuredClone(pkg);
  const nextLock = structuredClone(lock);
  const changes = [];
  const unresolved = [];
  for (const section of SECTIONS) {
    for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
      if (!/^[~^]\d/.test(spec)) continue;
      const version = installedVersion(lock, workspace, name);
      if (!version) {
        unresolved.push(`${section}.${name} ${spec} (not found in lockfile)`);
        continue;
      }
      nextPkg[section][name] = version;
      if (nextLock.packages?.[workspace]?.[section]?.[name] !== undefined) nextLock.packages[workspace][section][name] = version;
      changes.push(`${section}.${name} ${spec} → ${version}`);
    }
  }
  return { pkg: nextPkg, lock: nextLock, changes, unresolved };
}
