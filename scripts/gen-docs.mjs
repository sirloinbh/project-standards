// Generates docs/projects.md from the registry, docs/versions.md from versions.json, and docs/design-tokens.md.
// Usage: node scripts/gen-docs.mjs          write the file
//        node scripts/gen-docs.mjs --check  fail if the committed file is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/registry.mjs';

const UNSET = 'TBD';

export function renderProjects({ projects, platform, sync }) {
  const rollout = new Map(sync.targets.map((t) => [t.project, t.rollout]));
  const lines = [
    '# Project overview',
    '',
    '<!-- Generated file. Edit registry/projects.json, then regenerate with `npm run docs`. -->',
    '',
    '## Projects',
    '',
    '| Slot | Project | Name | Display name | Domain | Status | DB / test DB | Service address | AWS prefix | Rollout stage |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const host = p.service.domain ? [p.service.subdomain, p.service.domain].filter(Boolean).join('.') : UNSET;
    lines.push(
      `| ${String(p.slot).padStart(2, '0')} | ${p.name} | ${p.title} | ${p.displayName} | ${p.domain} | ${p.status} | ${p.db.name} / ${p.db.testName} | ${host} | ${p.aws.prefix ?? UNSET} | ${rollout.get(p.name) ?? '-'} |`,
    );
  }
  lines.push('', '## Ports', '', '| Project | web | api | e2e api | vite | e2e web | db |', '|---|---|---|---|---|---|---|');
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const ports = p.ports;
    lines.push(`| ${p.name} | ${ports.web} | ${ports.api} | ${ports.e2eApi} | ${ports.vite} | ${ports.e2eWeb} | ${ports.db} |`);
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

export function renderTokens(t) {
  const size = Object.fromEntries(t.fontSize.map((s) => [s.name, s]));
  const weight = Object.fromEntries(t.fontWeight.map((w) => [w.name, w]));
  const dark = Object.fromEntries(t.color.dark.map((c) => [c.name, c.value]));
  return [
    '# Design tokens',
    '',
    '<!-- Generated file. Edit design/tokens.json, then regenerate with `npm run docs`. -->',
    '',
    `Values shared by the 8 apps. Names follow the shadcn/ui and Tailwind CSS 4 conventions ([ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)). The only thing that differs per app is the display name; all apps use the same black-and-white colors ([ADR-0008](adr/0008-neutral-light-dark.md)).`,
    '',
    '## Fonts',
    '',
    `- Body and headings: \`${t.font.sans}\``,
    `- Monospace: \`${t.font.mono}\``,
    `- Pretendard ${t.font.pretendard.version} (${t.font.pretendard.released}), ${t.font.pretendard.license}. ${t.font.pretendard.delivery} \`font-display: ${t.font.pretendard.fontDisplay}\`.`,
    '',
    '## Font sizes',
    '',
    ...table(['Name', 'Size', 'Line height', 'Used for'], t.fontSize.map((s) => [`\`text-${s.name}\``, `${s.size} (${s.px}px)`, s.lineHeight, s.use])),
    '',
    '## Font weights',
    '',
    ...table(['Name', 'Value', 'Used for'], t.fontWeight.map((w) => [`\`font-${w.name}\``, w.value, w.use])),
    '',
    '## Text styles (heading levels, body, caption)',
    '',
    'The mobile size is the default, and from `md` (768px) up it grows to the size on the right.',
    '',
    ...table(
      ['Style', 'Element', 'Mobile', 'md and up', 'Weight', 'Tracking', 'Color', 'Used for'],
      t.textStyles.map((s) => [`\`${s.name}\``, `\`${s.element}\``, `${size[s.size].px}px`, `${size[s.sizeMd].px}px`, weight[s.weight].value, s.tracking, `\`${s.color}\``, s.use]),
    ),
    '',
    '## Spacing',
    '',
    `- ${t.spacing.rule}`,
    '',
    ...table(['Name', 'Mobile', 'md', 'lg', 'Used for'], t.spacing.layout.map((l) => [`\`${l.name}\``, l.mobile, l.md, l.lg, l.use])),
    '',
    '## Corner radius',
    '',
    ...table(['Name', 'CSS variable', 'Value', 'px', 'Used for'], t.radius.map((r) => [`\`rounded-${r.name}\``, `\`${r.css}\``, `\`${r.value}\``, r.px, r.use])),
    '',
    '## Shadows and borders',
    '',
    ...table(['Name', 'Used for'], t.shadow.map((s) => [`\`shadow-${s.name}\``, s.use])),
    '',
    `- ${t.border.rule}`,
    '',
    '## Responsive',
    '',
    `- ${t.responsive.approach} The narrowest screen is ${t.responsive.minWidth}.`,
    `- ${t.responsive.touchRule}`,
    `- ${t.responsive.safeArea}`,
    `- ${t.responsive.verify}`,
    '',
    ...table(['Breakpoint', 'Min width', 'Used for'], t.breakpoints.map((b) => [`\`${b.name}\``, `${b.minWidth} (${b.px}px)`, b.use])),
    '',
    '## Icon sizes',
    '',
    ...table(['Name', 'px', 'Used for'], t.icon.map((i) => [`\`${i.name}\``, i.px, i.use])),
    '',
    '## Stacking order (z-index)',
    '',
    ...table(['Name', 'Value', 'Used for'], t.zIndex.map((z) => [`\`${z.name}\``, z.value, z.use ?? ''])),
    '',
    '## Motion',
    '',
    `- Fast ${t.motion.fast}, normal ${t.motion.normal}, slow ${t.motion.slow}, easing \`${t.motion.easing}\`.`,
    `- ${t.motion.rule}`,
    '',
    '## Loading indicators',
    '',
    `- Skeleton: ${t.loading.skeleton}`,
    `- Spinner: ${t.loading.spinner}`,
    `- ${t.loading.rule}`,
    '',
    '## Colors',
    '',
    `Values are in ${t.color.format}. ${t.color.theme}`,
    '',
    `- ${t.color.mode}`,
    '',
    ...table(['Token', 'Light', 'Dark', 'Used for'], t.color.light.map((c) => [`\`--${c.name}\``, `\`${c.value}\``, `\`${dark[c.name]}\``, c.use])),
    '',
    '## workout-memo legacy token mapping',
    '',
    t.legacy.description,
    '',
    ...table(['Legacy', 'New token', 'Note'], t.legacy.map.map((m) => [`\`${m.old}\``, m.new, m.note])),
    '',
  ].join('\n');
}

export function renderVersions(v, dependencyFiles) {
  const rows = [];
  for (const [part, sections] of Object.entries(v.dependencies)) {
    for (const [section, deps] of Object.entries(sections)) {
      for (const [name, version] of Object.entries(deps)) rows.push([`\`${name}\``, version, `\`${dependencyFiles[part]}\``, section]);
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
  ].join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const tokens = JSON.parse(fs.readFileSync(path.join(root, 'design/tokens.json'), 'utf8'));
  const outputs = [
    ['docs/projects.md', renderProjects(loadAll(root).data)],
    ['docs/versions.md', renderVersions(loadAll(root).data.versions, JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8')).dependencyFields.files)],
    ['docs/design-tokens.md', renderTokens(tokens)],
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
