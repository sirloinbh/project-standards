// Generates docs/projects.md from the registry, docs/versions.md from versions.json.
// Usage: node scripts/gen-docs.mjs          write the file
//        node scripts/gen-docs.mjs --check  fail if the committed file is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, serviceHost } from './lib/registry.mjs';

const UNSET = 'TBD';

export function renderProjects({ projects, platform, sync }) {
  const synced = new Map(sync.targets.map((t) => [t.project, t.enabled === false ? 'paused' : 'yes']));
  const lines = [
    '# Project overview',
    '',
    '<!-- Generated file. Edit registry/projects.json, then regenerate with `npm run docs`. -->',
    '',
    '## Projects',
    '',
    '| Slot | Project | Name | Display name | Domain | Status | DB / test DB | Service address | AWS prefix | Synced |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const host = serviceHost(p, platform) ?? UNSET;
    lines.push(
      `| ${String(p.slot).padStart(2, '0')} | ${p.name} | ${p.title} | ${p.displayName} | ${p.domain} | ${p.status} | ${p.db.name} / ${p.db.testName} | ${host} | ${p.aws.prefix ?? UNSET} | ${synced.get(p.name) ?? '-'} |`,
    );
  }
  lines.push('', '## Ports', '', '| Project | web | api | e2e api | vite | e2e web | db |', '|---|---|---|---|---|---|---|');
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const ports = p.ports;
    lines.push(`| ${p.name} | ${ports.web} | ${ports.api} | ${ports.e2eApi} | ${ports.vite} | ${ports.e2eWeb} | ${ports.db} |`);
  }
  const tools = [...(projects.localTools ?? [])].sort((a, b) => a.slot - b.slot);
  if (tools.length) {
    lines.push('', '## Local tools', '', 'Not apps: no deploy, DB, or sync. They hold a slot so their ports never collide with an app, and use only the ports listed.', '');
    lines.push('| Slot | Tool | Repository | Ports | Summary |', '|---|---|---|---|---|');
    for (const t of tools) {
      const ports = Object.entries(t.ports).map(([kind, port]) => `${kind} ${port}`).join(', ');
      lines.push(`| ${String(t.slot).padStart(2, '0')} | ${t.name} | ${t.repo} | ${ports} | ${t.summary} |`);
    }
  }
  const services = [...(projects.sharedServices ?? [])].sort((a, b) => a.slot - b.slot);
  if (services.length) {
    lines.push('', '## Shared services', '', 'Not apps: services every app uses (ADR-0015). They hold a slot, and may use a reserved subdomain.', '');
    lines.push('| Slot | Service | Repository | Address | Ports | Summary |', '|---|---|---|---|---|---|');
    for (const t of services) {
      const ports = Object.entries(t.ports).map(([kind, port]) => `${kind} ${port}`).join(', ');
      const host = platform.rootDomain ? `${t.subdomain}.${platform.rootDomain}` : UNSET;
      lines.push(`| ${String(t.slot).padStart(2, '0')} | ${t.name} | ${t.repo} | ${host} | ${ports} | ${t.summary} |`);
    }
  }
  const s = platform.portScheme;
  lines.push(
    '',
    `Port formula: base value + slot. web ${s.web}, api ${s.api}, e2e api ${s.e2eApi}, vite ${s.vite}, e2e web ${s.e2eWeb}, db ${s.db}. Reserved ports (do not assign): ${platform.reservedPorts.join(', ')}. Basis: [ADR-0006](adr/0006-port-slot-allocation.md)`,
    '',
    '## Shared values',
    '',
    '| Item | Value |',
    '|---|---|',
    `| Root domain | ${platform.rootDomain ?? UNSET} |`,
    `| AWS region | ${platform.aws.region} |`,
    `| AWS account alias | ${platform.aws.accountAlias ?? UNSET} |`,
    `| AWS shared prefix | ${platform.aws.sharedPrefix ?? UNSET} |`,
    '',
  );
  return lines.join('\n');
}

const table = (headers, rows) => [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];

export function renderVersions(v, dependencyFiles) {
  const rows = [];
  for (const [part, sections] of Object.entries(v.dependencies)) {
    for (const [section, deps] of Object.entries(sections)) {
      for (const [name, version] of Object.entries(deps)) rows.push([`\`${name}\``, version, `\`${dependencyFiles[part]}\``, section]);
    }
  }
  const optional = [];
  for (const [part, sections] of Object.entries(v.optionalDependencies ?? {})) {
    for (const [section, deps] of Object.entries(sections)) {
      for (const [name, version] of Object.entries(deps)) optional.push([`\`${name}\``, version, `\`${dependencyFiles[part]}\``, section]);
    }
  }
  return [
    '# Version source',
    '',
    '<!-- Generated file. Edit versions.json, then regenerate with `npm run docs`. -->',
    '',
    'Tool and package versions set centrally. To change them, follow the [dependency policy](dependency-policy.md).',
    '',
    '## Tools',
    '',
    ...table(['Item', 'Version'], [
      ['Node', v.node],
      ['npm', v.npm],
      ['PostgreSQL', v.postgres],
      ['Terraform', `${v.terraform.required} (CI ${v.terraform.cli ?? 'TBD'})`],
      ['GitHub runner', `\`${v.runner}\``],
      ...Object.entries(v.images).map(([name, image]) => [`Image ${name}`, `\`${image.split('@')[0]}\`${image.includes('@') ? ' (digest pinned)' : ''}`]),
    ]),
    '',
    '## Shared config packages (@sirloinbh)',
    '',
    ...table(['Package', 'Version'], Object.entries(v.packages).map(([name, version]) => [`\`${name}\``, version ?? 'unpublished'])),
    '',
    '## Common app dependencies',
    '',
    'External dependencies that the 8 apps and the scaffold use at the same version, in the same file and the same section. They are managed fields of each app `package.json`, so if even one app has a different version, `standards-check` fails (#304). Dependencies used by a single app are not listed here.',
    '',
    ...table(['Package', 'Version', 'File', 'Section'], rows),
    '',
    '## Optional app dependencies',
    '',
    'Used by only some apps. The sync writes the version below only into an app whose `package.json` already lists the package, and never adds it (#704).',
    '',
    ...table(['Package', 'Version', 'File', 'Section'], optional),
    '',
  ].join('\n');
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outputs = [
    ['docs/projects.md', renderProjects(loadAll(root).data)],
    ['docs/versions.md', renderVersions(loadAll(root).data.versions, JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8')).dependencyFields.files)],
  ];
  let stale = false;
  for (const [rel, text] of outputs) {
    const target = path.join(root, rel);
    if (process.argv.includes('--check')) {
      const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
      if (current !== text) {
        console.error(`${rel} is stale. Run \`npm run docs\` and commit the result.`);
        stale = true;
      } else console.log(`${rel}: up to date`);
    } else {
      fs.writeFileSync(target, text);
      console.log(`wrote ${rel}`);
    }
  }
  if (stale) process.exit(1);
}
