// Files the sync generates from registry data instead of copying a template (#705).
// sync.config.json lists them per target in `generatedFiles` ({ "<target path>": "<kind>" }), so adding an
// app is one edit in registry/projects.json and every repo that lists the app reads it from a managed file.

const NOTE = 'Generated from registry/projects.json in sirloinbh/project-standards. Do not edit here; change the registry.';
const quote = (v) => `'${String(v).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const activeApps = (data) => data.projects.projects.filter((p) => p.status === 'active').sort((a, b) => a.slot - b.slot);

const KINDS = {
  // shared-ai builds `http://<name>-api:<port>` for every app that answers tool calls.
  'apps-ts': (data) =>
    [
      `// Managed file. ${NOTE}`,
      '// Every active app and the port of its API container.',
      'export const REGISTRY_APPS: readonly (readonly [string, number])[] = [',
      ...activeApps(data).map((p) => `  [${quote(p.name)}, ${p.ports.api}],`),
      '];',
      '',
    ].join('\n'),
  // Terraform reads this with jsondecode(file("apps.json")): `apps` are the app subdomains, `sharedServices`
  // their reserved subdomains, and `secretApps` the names whose SSM keys the server may read.
  'apps-json': (data) =>
    `${JSON.stringify(
      {
        generated: NOTE,
        apps: activeApps(data).map((p) => p.name),
        sharedServices: data.projects.sharedServices.map((s) => s.subdomain),
        secretApps: [...activeApps(data).map((p) => p.name), ...data.projects.sharedServices.map((s) => s.name)],
      },
      null,
      2,
    )}\n`,
};

export const GENERATED_KINDS = Object.keys(KINDS);

/** The generated files of a target as sync plan entries: [{ path, mode, source, content }]. */
export function renderGeneratedFiles(target, data) {
  return Object.entries(target.generatedFiles ?? {}).map(([path, kind]) => {
    if (!KINDS[kind]) throw new Error(`generatedFiles ${path}: unknown kind "${kind}" (${GENERATED_KINDS.join(', ')})`);
    return { path, mode: 'full', source: 'scripts/lib/generated.mjs', content: KINDS[kind](data) };
  });
}
