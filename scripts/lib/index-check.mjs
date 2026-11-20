// Checks templates/index.json against sync.config.json and the registry schema (#863). The file decides what every
// downstream repo receives, so a misspelled profile, repository or feature must fail the check instead of silently
// leaving a file out of the sync PR.
const SECTIONS = new Set(['dependencies', 'devDependencies', 'optionalDependencies']);
const VENDOR_KEYS = new Set(['from', 'profiles', 'repos']);

/**
 * @param index templates/index.json
 * @param sync sync.config.json
 * @param projectsSchema registry/projects.schema.json (its `features` properties are the valid feature names)
 * @returns string[] of problems, empty when the file is consistent
 */
export function indexErrors(index, sync, projectsSchema) {
  const errors = [];
  const profiles = new Set(Object.keys(sync.profiles ?? {}));
  const targets = new Map((sync.targets ?? []).map((t) => [t.repo, t.profile]));
  const features = new Set(Object.keys(findFeatures(projectsSchema) ?? {}));
  const where = 'templates/index.json';

  const checkProfiles = (list, label) => {
    for (const p of list ?? []) if (!profiles.has(p)) errors.push(`${where} ${label}: unknown profile "${p}" (sync.config.json profiles: ${[...profiles].join(', ')})`);
  };

  for (const [target, entry] of Object.entries(index.vendor?.files ?? {})) {
    const label = `vendor.files["${target}"]`;
    if (typeof entry === 'string') continue;
    if (!entry || typeof entry !== 'object' || typeof entry.from !== 'string') {
      errors.push(`${where} ${label}: must be a source path or { from, profiles?, repos? }`);
      continue;
    }
    for (const key of Object.keys(entry)) if (!VENDOR_KEYS.has(key)) errors.push(`${where} ${label}: unknown key "${key}"`);
    checkProfiles(entry.profiles, `${label}.profiles`);
    for (const repo of entry.repos ?? []) {
      if (!targets.has(repo)) errors.push(`${where} ${label}.repos: "${repo}" is not a sync target in sync.config.json`);
      else if (entry.profiles && !entry.profiles.includes(targets.get(repo))) errors.push(`${where} ${label}.repos: "${repo}" has profile "${targets.get(repo)}", which is not in profiles, so the file would never be sent there`);
    }
  }

  const deps = index.dependencyFields;
  if (deps) {
    checkProfiles(deps.profiles, 'dependencyFields.profiles');
    const files = new Set(Object.values(deps.files ?? {}));
    for (const [file, fields] of Object.entries(deps.onlyWith ?? {})) {
      if (!files.has(file)) errors.push(`${where} dependencyFields.onlyWith: "${file}" is not one of dependencyFields.files`);
      for (const [field, feature] of Object.entries(fields)) {
        const section = field.split('.')[0];
        if (!SECTIONS.has(section) || field.length === section.length + 1 || !field.includes('.')) errors.push(`${where} dependencyFields.onlyWith["${file}"]: "${field}" must be <section>.<package> with a section of ${[...SECTIONS].join(', ')}`);
        if (!features.has(feature)) errors.push(`${where} dependencyFields.onlyWith["${file}"]["${field}"]: unknown feature "${feature}" (registry features: ${[...features].join(', ')})`);
      }
    }
  }

  for (const profile of Object.keys(index.fields ?? {})) checkProfiles([profile], 'fields');
  return errors;
}

// The `features` object schema of a project in registry/projects.schema.json.
function findFeatures(schema) {
  const stack = [schema];
  while (stack.length) {
    const node = stack.pop();
    if (node && typeof node === 'object') {
      if (node.properties?.features?.properties) return node.properties.features.properties;
      stack.push(...Object.values(node));
    }
  }
  return null;
}
