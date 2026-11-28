// Collects the template files of a profile and renders them for one target repository.
import fs from 'node:fs';
import path from 'node:path';
import { addHeader, renderFile, renderText } from './render.mjs';

export const TEMPLATE_SUFFIX = '.tmpl';

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink in templates requires inspection: ${full}`);
      return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
    })
    .sort();
}

export const loadIndex = (root) => JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8'));

/**
 * Lists { path, source } for every template in the given folders (e.g. ["common", "app"]).
 * `path` is the target path (".tmpl" removed); two folders may not produce the same path.
 */
export function collectTemplates(root, folders, external = {}) {
  const seen = new Map();
  for (const folder of folders) {
    // A folder in `external` ({ dir, label }) is read from the pinned design-system release instead of templates/ (#1171).
    const ext = external[folder];
    const add = (rel, fromRelease) => {
      const target = rel.endsWith(TEMPLATE_SUFFIX) ? rel.slice(0, -TEMPLATE_SUFFIX.length) : rel;
      const source = fromRelease ? `${ext.label}/${rel}` : `templates/${folder}/${rel}`;
      if (seen.has(target)) throw new Error(`${target} comes from both ${seen.get(target).source} and ${source}`);
      // The managed header keeps naming templates/<folder>/, so delivered files are byte-identical to the pre-move ones.
      seen.set(target, { source, file: fromRelease ? path.join(ext.dir, rel) : path.join(root, source), headerSource: `templates/${folder}/${rel}` });
    };
    for (const rel of walk(ext ? ext.dir : path.join(root, 'templates', folder))) add(rel, Boolean(ext));
    if (ext) {
      // Files that stay in project-standards (sign-in, service worker; #1207) are still delivered; the release wins on the same path.
      const delivered = new Set(walk(ext.dir));
      for (const rel of walk(path.join(root, 'templates', folder))) if (!delivered.has(rel)) add(rel, false);
    }
  }
  return [...seen].map(([target, entry]) => ({ path: target, ...entry }));
}

// Fills {{variables}} inside the field values of templates/index.json.
function renderFields(value, vars, where) {
  if (typeof value === 'string') return renderText(value, vars, where);
  if (Array.isArray(value)) return value.map((v) => renderFields(v, vars, where));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renderFields(v, vars, where)]));
  return value;
}

/** Flattens { engines: { node } } to { "engines.node": ... } for manifest field entries. */
function flatten(object, prefix = '') {
  return Object.entries(object).reduce((out, [key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...out, ...flatten(value, name) } : { ...out, [name]: value };
  }, {});
}

/** versions.json dependencies as flat package.json fields per target file, for the profiles in index.dependencyFields (#304). */
export function sharedDependencyFields(index, profile, versions, readPackage = () => null, features = {}) {
  const spec = index.dependencyFields;
  if (!spec?.profiles?.includes(profile)) return {};
  const out = {};
  for (const [part, sections] of Object.entries(versions?.dependencies ?? {})) {
    const target = spec.files?.[part];
    if (!target) throw new Error(`versions.json dependencies.${part} has no file in templates/index.json dependencyFields.files`);
    for (const [section, deps] of Object.entries(sections)) {
      for (const [name, version] of Object.entries(deps)) {
        // Field paths are dotted (applyFields), so a dot in a package name would split it.
        if (name.includes('.')) throw new Error(`versions.json dependencies.${part}.${section}: "${name}" contains a dot and cannot be a managed field`);
        (out[target] ??= {})[`${section}.${name}`] = version;
      }
    }
  }
  // Optional dependencies (#704) are set only where the app already lists the package, so the sync never adds one.
  for (const [part, sections] of Object.entries(versions?.optionalDependencies ?? {})) {
    const target = spec.files?.[part];
    if (!target) throw new Error(`versions.json optionalDependencies.${part} has no file in templates/index.json dependencyFields.files`);
    const pkg = readPackage(target);
    for (const [section, deps] of Object.entries(sections)) {
      for (const [name, version] of Object.entries(deps)) {
        if (name.includes('.')) throw new Error(`versions.json optionalDependencies.${part}.${section}: "${name}" contains a dot and cannot be a managed field`);
        if (out[target]?.[`${section}.${name}`] !== undefined) throw new Error(`versions.json: ${name} is in both dependencies and optionalDependencies (${part}.${section})`);
        // A field in dependencyFields.onlyWith also needs the project feature, so an app that dropped the package is not asked for it again (#783).
        const feature = spec.onlyWith?.[target]?.[`${section}.${name}`];
        if (feature && !features?.[feature]) continue;
        if (pkg?.[section]?.[name] !== undefined) (out[target] ??= {})[`${section}.${name}`] = version;
      }
    }
  }
  return out;
}

/**
 * Renders a profile for one target.
 * readExisting(path) returns the target's current text or null (needed to keep project sections).
 * Returns manifest-ready entries: [{ path, mode, content } | { path, mode: "fields", fields }].
 */
export function renderProfile({ root, profile, folders, vars, readExisting = () => null, external = {}, vendored = {} }) {
  const index = loadIndex(root);
  const section = new Set(index.section);
  // Data files such as labels.json are read by the sync script, not copied to the target.
  const data = new Set((index.data?.files ?? []).map((f) => `templates/${f}`));
  const files = collectTemplates(root, folders, external).filter(({ source }) => !data.has(source)).map(({ path: target, source, file, headerSource }) => {
    const mode = section.has(target) ? 'section' : 'full';
    const text = fs.readFileSync(file, 'utf8');
    const existing = mode === 'section' ? readExisting(target) : null;
    return { path: target, source, mode, content: renderFile({ text, file: target, source: headerSource, vars, mode, existing }) };
  });
  // Vendored code is copied verbatim (no variable rendering) with only the managed header added.
  // An entry is a source path (every profile) or { from, profiles, repos? } (only those profiles, and only those repos when listed, #672).
  for (const [target, entry] of Object.entries(index.vendor?.files ?? {})) {
    const source = typeof entry === 'string' ? entry : entry.from;
    if (typeof entry !== 'string' && (!entry.profiles?.includes(profile) || (entry.repos && !entry.repos.includes(vars.target?.repo)))) continue;
    if (files.some((f) => f.path === target)) throw new Error(`${target} is both a template and a vendored file`);
    // A source in `vendored` ({ file, label }) is read from the pinned design-system release; the header still names `source` (#1169).
    const ext = vendored[source];
    const text = fs.readFileSync(ext ? ext.file : path.join(root, source), 'utf8').replace(/\r\n/g, '\n');
    files.push({ path: target, source: ext ? ext.label : source, mode: 'full', content: addHeader(text, target, source) });
  }
  // Copies such as .claude/skills/ get exactly the same content as their source path.
  for (const { from, to } of index.mirror ?? []) {
    for (const f of files.filter((file) => file.path.startsWith(from))) {
      const copy = `${to}${f.path.slice(from.length)}`;
      if (files.some((file) => file.path === copy)) throw new Error(`${copy} is both a template and a mirror of ${f.path}`);
      files.push({ ...f, path: copy });
    }
  }
  const readPackage = (target) => {
    const text = readExisting(target);
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };
  const shared = sharedDependencyFields(index, profile, vars.versions, readPackage, vars.project?.features);
  for (const target of new Set([...Object.keys(index.fields[profile] ?? {}), ...Object.keys(shared)])) {
    if (files.some((f) => f.path === target)) throw new Error(`${target} is both a template file and a fields entry`);
    const own = flatten(renderFields(index.fields[profile]?.[target] ?? {}, vars, `templates/index.json ${target}`));
    const overlap = Object.keys(shared[target] ?? {}).filter((k) => k in own);
    if (overlap.length) throw new Error(`${target}: ${overlap.join(', ')} is set by both templates/index.json fields and versions.json dependencies`);
    files.push({ path: target, source: 'templates/index.json', mode: 'fields', fields: { ...own, ...shared[target] } });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
