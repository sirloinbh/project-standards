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
export function collectTemplates(root, folders) {
  const seen = new Map();
  for (const folder of folders) {
    for (const rel of walk(path.join(root, 'templates', folder))) {
      const target = rel.endsWith(TEMPLATE_SUFFIX) ? rel.slice(0, -TEMPLATE_SUFFIX.length) : rel;
      const source = `templates/${folder}/${rel}`;
      if (seen.has(target)) throw new Error(`${target} comes from both ${seen.get(target)} and ${source}`);
      seen.set(target, source);
    }
  }
  return [...seen].map(([target, source]) => ({ path: target, source }));
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
export function sharedDependencyFields(index, profile, versions) {
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
  return out;
}

/**
 * Renders a profile for one target.
 * readExisting(path) returns the target's current text or null (needed to keep project sections).
 * Returns manifest-ready entries: [{ path, mode, content } | { path, mode: "fields", fields }].
 */
export function renderProfile({ root, profile, folders, vars, readExisting = () => null }) {
  const index = loadIndex(root);
  const section = new Set(index.section);
  // Data files such as labels.json are read by the sync script, not copied to the target.
  const data = new Set((index.data?.files ?? []).map((f) => `templates/${f}`));
  const files = collectTemplates(root, folders).filter(({ source }) => !data.has(source)).map(({ path: target, source }) => {
    const mode = section.has(target) ? 'section' : 'full';
    const text = fs.readFileSync(path.join(root, source), 'utf8');
    const existing = mode === 'section' ? readExisting(target) : null;
    return { path: target, source, mode, content: renderFile({ text, file: target, source, vars, mode, existing }) };
  });
  // Vendored code is copied verbatim (no variable rendering) with only the managed header added.
  for (const [target, source] of Object.entries(index.vendor?.files ?? {})) {
    if (files.some((f) => f.path === target)) throw new Error(`${target} is both a template and a vendored file`);
    const text = fs.readFileSync(path.join(root, source), 'utf8').replace(/\r\n/g, '\n');
    files.push({ path: target, source, mode: 'full', content: addHeader(text, target, source) });
  }
  // Copies such as .claude/skills/ get exactly the same content as their source path.
  for (const { from, to } of index.mirror ?? []) {
    for (const f of files.filter((file) => file.path.startsWith(from))) {
      const copy = `${to}${f.path.slice(from.length)}`;
      if (files.some((file) => file.path === copy)) throw new Error(`${copy} is both a template and a mirror of ${f.path}`);
      files.push({ ...f, path: copy });
    }
  }
  const shared = sharedDependencyFields(index, profile, vars.versions);
  for (const target of new Set([...Object.keys(index.fields[profile] ?? {}), ...Object.keys(shared)])) {
    if (files.some((f) => f.path === target)) throw new Error(`${target} is both a template file and a fields entry`);
    const own = flatten(renderFields(index.fields[profile]?.[target] ?? {}, vars, `templates/index.json ${target}`));
    const overlap = Object.keys(shared[target] ?? {}).filter((k) => k in own);
    if (overlap.length) throw new Error(`${target}: ${overlap.join(', ')} is set by both templates/index.json fields and versions.json dependencies`);
    files.push({ path: target, source: 'templates/index.json', mode: 'fields', fields: { ...own, ...shared[target] } });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
