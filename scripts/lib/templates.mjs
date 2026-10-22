// Collects the template files of a profile and renders them for one target repository.
import fs from 'node:fs';
import path from 'node:path';
import { renderFile, renderText } from './render.mjs';

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

/**
 * Renders a profile for one target.
 * readExisting(path) returns the target's current text or null (needed to keep project sections).
 * Returns manifest-ready entries: [{ path, mode, content } | { path, mode: "fields", fields }].
 */
export function renderProfile({ root, profile, folders, vars, readExisting = () => null }) {
  const index = loadIndex(root);
  const section = new Set(index.section);
  const files = collectTemplates(root, folders).map(({ path: target, source }) => {
    const mode = section.has(target) ? 'section' : 'full';
    const text = fs.readFileSync(path.join(root, source), 'utf8');
    const existing = mode === 'section' ? readExisting(target) : null;
    return { path: target, source, mode, content: renderFile({ text, file: target, source, vars, mode, existing }) };
  });
  // Copies such as .claude/skills/ get exactly the same content as their source path.
  for (const { from, to } of index.mirror ?? []) {
    for (const f of files.filter((file) => file.path.startsWith(from))) {
      const copy = `${to}${f.path.slice(from.length)}`;
      if (files.some((file) => file.path === copy)) throw new Error(`${copy} is both a template and a mirror of ${f.path}`);
      files.push({ ...f, path: copy });
    }
  }
  for (const [target, fields] of Object.entries(index.fields[profile] ?? {})) {
    if (files.some((f) => f.path === target)) throw new Error(`${target} is both a template file and a fields entry`);
    files.push({ path: target, source: 'templates/index.json', mode: 'fields', fields: flatten(renderFields(fields, vars, `templates/index.json ${target}`)) });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
