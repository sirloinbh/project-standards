// Computes what a sync would write into one target repository, without any network access.
import { buildManifest, MANIFEST_PATH } from './manifest.mjs';
import { renderProfile } from './templates.mjs';
import { buildVars } from './vars.mjs';

/** Converts a path pattern with `*` and `**` into a RegExp matching whole repository paths. */
export function globToRegExp(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      // "**/" matches zero or more folders; a trailing "**" matches anything.
      if (pattern[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export const matchesAny = (file, patterns) => patterns.some((p) => globToRegExp(p).test(file));

/** Sets dotted fields in a package.json text, keeping other fields and 2-space formatting. */
export function applyFields(text, fields) {
  const json = JSON.parse(text);
  for (const [dotted, value] of Object.entries(fields)) {
    const keys = dotted.split('.');
    let node = json;
    for (const key of keys.slice(0, -1)) node = node[key] && typeof node[key] === 'object' ? node[key] : (node[key] = {});
    node[keys.at(-1)] = value;
  }
  return `${JSON.stringify(json, null, 2)}\n`;
}

/**
 * Plans one target. readExisting(path) returns the target repository's current text or null.
 * Returns { target, inRollout, files: [{ path, mode, source, content }], skipped: [{ path, reason }], fieldsPending: [path], manifest }.
 */
export function planTarget({ root, data, target, centralSha, workflowSha = centralSha, readExisting = () => null }) {
  const profile = data.sync.profiles[target.profile];
  if (!profile) throw new Error(`${target.repo}: unknown profile "${target.profile}"`);
  const vars = buildVars(data, target, { centralSha, workflowSha });
  const project = vars.project;
  const rendered = renderProfile({ root, profile: target.profile, folders: profile.templates, vars, readExisting });

  const allowed = (project?.allowedDifferences ?? []).map((d) => d.path);
  const skipped = [];
  const kept = [];
  for (const file of rendered) {
    if (matchesAny(file.path, profile.neverTouch)) throw new Error(`${target.repo}: template ${file.source} would write protected path ${file.path}`);
    if (matchesAny(file.path, allowed)) skipped.push({ path: file.path, reason: 'allowedDifferences' });
    else kept.push(file);
  }

  const packages = Object.fromEntries(profile.packages.map((name) => [name, data.versions.packages[name] ?? null]));
  const registry = project ? { ports: project.ports, db: project.db } : null;
  const manifest = buildManifest({ centralSha, profile: target.profile, project: target.project, files: kept, packages, registry });

  const files = [];
  const fieldsPending = [];
  for (const file of kept) {
    if (file.mode !== 'fields') {
      files.push(file);
      continue;
    }
    const existing = readExisting(file.path);
    if (existing === null) fieldsPending.push(file.path);
    else files.push({ ...file, content: applyFields(existing, file.fields) });
  }
  files.push({ path: MANIFEST_PATH, mode: 'generated', source: 'scripts/sync.mjs', content: `${JSON.stringify(manifest, null, 2)}\n` });

  return { target, inRollout: target.rollout <= data.sync.maxRollout, files, skipped, fieldsPending, manifest };
}
