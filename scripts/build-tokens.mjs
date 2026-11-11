// Generates packages/design-tokens/tokens.css and tailwind.css from design/tokens.json.
// Usage: node scripts/build-tokens.mjs          write the files
//        node scripts/build-tokens.mjs --check  fail if the committed files are stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADER = '/* Generated file. Edit design/tokens.json in sirloinbh/project-standards and regenerate with `npm run tokens`. */';

const byName = (list) => Object.fromEntries(list.map((x) => [x.name, x]));

export function renderTokensCss(t) {
  const layout = t.spacing.layout;
  const darkColors = (indent) => [`${indent}color-scheme: dark;`, ...t.color.dark.map((c) => `${indent}--${c.name}: ${c.value};`)];
  const lines = [
    HEADER,
    '/* CSS variables usable without Tailwind. All apps use the same black-and-white colors (ADR-0008). */',
    '/* Dark mode: <html class="dark">, or the system setting (prefers-color-scheme) when there is no class. <html class="light"> forces light. */',
    "@import './fonts/pretendard.css';",
    '',
    ':root {',
    '  color-scheme: light;',
    `  --font-family-sans: ${t.font.sans};`,
    `  --font-family-mono: ${t.font.mono};`,
    `  --radius: ${t.radius.find((r) => r.name === 'base').value};`,
    `  --touch-target: ${t.responsive.touchTarget};`,
    `  --border-width: ${t.border.width};`,
    ...t.color.light.map((c) => `  --${c.name}: ${c.value};`),
    ...t.zIndex.map((z) => `  --z-${z.name}: ${z.value};`),
    `  --duration-fast: ${t.motion.fast};`,
    `  --duration-normal: ${t.motion.normal};`,
    `  --duration-slow: ${t.motion.slow};`,
    `  --ease-standard: ${t.motion.easing};`,
    ...layout.map((l) => `  --${l.name}: ${l.mobile};`),
    '}',
    '',
    '.dark {',
    ...darkColors('  '),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not(.light) {',
    ...darkColors('    '),
    '  }',
    '}',
    '',
  ];
  for (const bp of ['md', 'lg']) {
    const min = t.breakpoints.find((b) => b.name === bp).minWidth;
    lines.push(`@media (min-width: ${min}) {`, '  :root {', ...layout.map((l) => `    --${l.name}: ${l[bp]};`), '  }', '}', '');
  }
  lines.push('@media (prefers-reduced-motion: reduce) {', '  :root {', '    --duration-fast: 0ms;', '    --duration-normal: 0ms;', '    --duration-slow: 0ms;', '  }', '}', '');
  return lines.join('\n');
}

export function renderTailwindCss(t) {
  const size = byName(t.fontSize);
  const weight = byName(t.fontWeight);
  const md = t.breakpoints.find((b) => b.name === 'md').minWidth;
  const styleRule = (s, sizeName) => [
    `font-size: var(--text-${sizeName});`,
    `line-height: var(--text-${sizeName}--line-height);`,
    `font-weight: ${weight[s.weight].value};`,
    `letter-spacing: ${s.tracking};`,
    `color: var(--color-${s.color});`,
  ];
  const lines = [
    HEADER,
    '/* For Tailwind CSS 4 apps. Import it in the app main CSS after tailwindcss. */',
    "@import './tokens.css';",
    '',
    '/* The dark: utility uses the same condition as tokens.css: the .dark class, or system dark mode when .light is absent */',
    '@custom-variant dark {',
    '  &:where(.dark, .dark *) {',
    '    @slot;',
    '  }',
    '  @media (prefers-color-scheme: dark) {',
    '    &:where(:root:not(.light), :root:not(.light) *) {',
    '      @slot;',
    '    }',
    '  }',
    '}',
    '',
    '@theme {',
    ...t.fontSize.map((s) => `  --text-${s.name}: ${s.size};\n  --text-${s.name}--line-height: ${s.lineHeight};`),
    ...t.breakpoints.map((b) => `  --breakpoint-${b.name}: ${b.minWidth};`),
    '}',
    '',
    '@theme inline {',
    '  --font-sans: var(--font-family-sans);',
    '  --font-mono: var(--font-family-mono);',
    ...t.color.light.map((c) => `  --color-${c.name}: var(--${c.name});`),
    ...t.radius.filter((r) => r.name !== 'base').map((r) => `  ${r.css}: ${r.value};`),
    '}',
    '',
    '@layer base {',
    '  * {',
    '    border-color: var(--color-border);',
    '    outline-color: color-mix(in oklab, var(--color-ring) 50%, transparent);',
    '  }',
    '  body {',
    '    background-color: var(--color-background);',
    '    color: var(--color-foreground);',
    '    font-family: var(--font-sans);',
    '  }',
  ];
  for (const s of t.textStyles.filter((x) => /^h[1-4]$/.test(x.element))) {
    lines.push(`  ${s.element} {`, ...styleRule(s, s.size).map((l) => `    ${l}`), '  }');
    if (s.sizeMd !== s.size) lines.push(`  @media (min-width: ${md}) {`, `    ${s.element} {`, `      font-size: var(--text-${s.sizeMd});`, `      line-height: var(--text-${s.sizeMd}--line-height);`, '    }', '  }');
  }
  lines.push('}', '');
  // Non-heading styles become utilities (text-body, text-caption, ...); headings are styled by element above.
  for (const s of t.textStyles.filter((x) => !/^h[1-4]$/.test(x.element))) {
    if (!size[s.size]) throw new Error(`unknown size ${s.size}`);
    lines.push(`@utility text-${s.name} {`, ...styleRule(s, s.size).map((l) => `  ${l}`), '}', '');
  }
  return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const tokens = JSON.parse(fs.readFileSync(path.join(root, 'design/tokens.json'), 'utf8'));
  const outputs = [
    ['packages/design-tokens/tokens.css', renderTokensCss(tokens)],
    ['packages/design-tokens/tailwind.css', renderTailwindCss(tokens)],
  ];
  let stale = false;
  for (const [rel, text] of outputs) {
    const file = path.join(root, rel);
    if (process.argv.includes('--check')) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
      if (current !== text) {
        console.error(`${rel} is stale. Run \`npm run tokens\` and commit the result.`);
        stale = true;
      } else console.log(`${rel}: up to date`);
    } else {
      fs.writeFileSync(file, text);
      console.log(`wrote ${rel}`);
    }
  }
  if (stale) process.exit(1);
}
