// Loads the source-of-truth JSON files and checks them against their schemas and
// against each other (duplicates, port formula, reserved ports, sync targets).
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './schema.mjs';

export const FILES = {
  projects: ['registry/projects.json', 'registry/projects.schema.json'],
  platform: ['registry/platform.json', 'registry/platform.schema.json'],
  versions: ['versions.json', 'versions.schema.json'],
  sync: ['sync.config.json', 'sync.config.schema.json'],
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Reads every data file and its schema: { data: { projects, ... }, schemas: { projects, ... } }. */
export function loadAll(root) {
  const data = {};
  const schemas = {};
  for (const [key, [dataFile, schemaFile]] of Object.entries(FILES)) {
    data[key] = readJson(path.join(root, dataFile));
    schemas[key] = readJson(path.join(root, schemaFile));
  }
  return { data, schemas };
}

export const PORT_KINDS = ['web', 'api', 'e2eApi', 'vite', 'e2eWeb', 'db'];

// Reports every value that appears more than once, naming who uses it.
function duplicates(entries, label, errors) {
  const owners = new Map();
  for (const [value, owner] of entries) {
    if (value === null || value === undefined) continue;
    owners.set(value, [...(owners.get(value) ?? []), owner]);
  }
  for (const [value, list] of owners) {
    if (list.length > 1) errors.push(`${label} "${value}" is used by ${list.join(', ')}`);
  }
}

/**
 * Returns { errors, warnings } as human-readable strings.
 * `today` (YYYY-MM-DD) decides whether an allowedDifferences entry has expired.
 */
export function checkAll({ data, schemas }, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const errors = [];
  const warnings = [];

  for (const [key, [dataFile]] of Object.entries(FILES)) {
    for (const e of validate(schemas[key], data[key])) errors.push(`${dataFile} ${e.path}: ${e.message}`);
  }
  // Cross-file checks assume the shapes are valid.
  if (errors.length) return { errors, warnings };

  const { projects } = data.projects;
  const { portScheme, reservedPorts } = data.platform;

  duplicates(projects.map((p) => [p.slot, p.name]), 'slot', errors);
  duplicates(projects.map((p) => [p.name, `slot ${p.slot}`]), 'project name', errors);
  duplicates(
    projects.flatMap((p) => Object.entries(p.repos).map(([kind, repo]) => [repo, `${p.name}.${kind}`])),
    'repository',
    errors,
  );
  duplicates(
    projects.flatMap((p) => [[p.db.name, `${p.name}.db.name`], [p.db.testName, `${p.name}.db.testName`]]),
    'database name',
    errors,
  );
  duplicates(
    projects.map((p) => [p.service.domain && [p.service.subdomain, p.service.domain].filter(Boolean).join('.'), p.name]),
    'service host',
    errors,
  );
  duplicates(projects.map((p) => [p.aws.prefix, p.name]), 'AWS prefix', errors);
  duplicates(
    projects.flatMap((p) => PORT_KINDS.map((kind) => [p.ports[kind], `${p.name}.${kind}`])),
    'port',
    errors,
  );

  for (const p of projects) {
    if (p.slot > portScheme.maxSlot) errors.push(`${p.name}: slot ${p.slot} exceeds maxSlot ${portScheme.maxSlot}`);
    for (const kind of PORT_KINDS) {
      const expected = portScheme[kind] + p.slot;
      if (p.ports[kind] !== expected) errors.push(`${p.name}.ports.${kind} is ${p.ports[kind]}, expected ${expected} (${portScheme[kind]} + slot ${p.slot})`);
      if (reservedPorts.includes(p.ports[kind])) errors.push(`${p.name}.ports.${kind} uses reserved port ${p.ports[kind]}`);
    }
    if (p.db.name === p.db.testName) errors.push(`${p.name}: db.testName must differ from db.name`);
    for (const d of p.allowedDifferences) {
      if (d.until && d.until < today) warnings.push(`${p.name}: allowedDifferences "${d.path}" expired on ${d.until}`);
    }
  }

  // Ports of all slots up to maxSlot must stay clear of reserved ports, so new projects never collide.
  for (let slot = 1; slot <= portScheme.maxSlot; slot++) {
    for (const kind of PORT_KINDS) {
      if (reservedPorts.includes(portScheme[kind] + slot)) errors.push(`portScheme.${kind} + slot ${slot} hits reserved port ${portScheme[kind] + slot}`);
    }
  }

  const { profiles, targets } = data.sync;
  const active = new Set(projects.filter((p) => p.status === 'active').map((p) => p.name));
  duplicates(targets.map((t) => [t.repo, `rollout ${t.rollout}`]), 'sync target', errors);
  duplicates(targets.filter((t) => t.project).map((t) => [t.project, t.repo]), 'sync project', errors);
  for (const t of targets) {
    if (!profiles[t.profile]) errors.push(`sync target ${t.repo}: unknown profile "${t.profile}"`);
    if (t.profile === 'app' && !active.has(t.project)) errors.push(`sync target ${t.repo}: project "${t.project}" is not an active registry project`);
    if (t.profile !== 'app' && t.project !== null) errors.push(`sync target ${t.repo}: only app targets may name a project`);
    const project = projects.find((p) => p.name === t.project);
    if (project && t.repo !== `sirloinbh/${project.repos.umbrella}`) errors.push(`sync target ${t.repo}: expected sirloinbh/${project.repos.umbrella}`);
  }
  for (const name of active) {
    if (!targets.some((t) => t.project === name)) warnings.push(`active project ${name} has no sync target`);
  }
  for (const [name, profile] of Object.entries(profiles)) {
    for (const pkg of profile.packages) {
      if (!(pkg in data.versions.packages)) errors.push(`profile ${name}: package ${pkg} is missing from versions.json`);
    }
  }

  return { errors, warnings };
}
