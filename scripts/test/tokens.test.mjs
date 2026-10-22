import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderTokens } from '../gen-docs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'design/tokens.json'), 'utf8'));
const names = (list) => list.map((x) => x.name);
const ascending = (values) => values.every((v, i) => i === 0 || v > values[i - 1]);

test('font sizes, weights, breakpoints, and z-index layers are unique and ascending', () => {
  for (const list of [tokens.fontSize, tokens.fontWeight, tokens.breakpoints, tokens.zIndex, tokens.icon, tokens.radius]) {
    assert.equal(new Set(names(list)).size, list.length);
  }
  assert.ok(ascending(tokens.fontSize.map((s) => s.px)));
  assert.ok(ascending(tokens.fontWeight.map((w) => w.value)));
  assert.ok(ascending(tokens.breakpoints.map((b) => b.px)));
  assert.ok(ascending(tokens.zIndex.map((z) => z.value)));
});

test('text styles only use defined sizes and weights and keep a heading order', () => {
  const sizes = new Map(tokens.fontSize.map((s) => [s.name, s.px]));
  const weights = new Set(names(tokens.fontWeight));
  for (const s of tokens.textStyles) {
    assert.ok(sizes.has(s.size) && sizes.has(s.sizeMd), s.name);
    assert.ok(weights.has(s.weight), s.name);
    assert.ok(sizes.get(s.sizeMd) >= sizes.get(s.size), `${s.name} does not shrink on wider screens`);
  }
  const heading = (n) => tokens.textStyles.find((s) => s.name === n);
  for (const [bigger, smaller] of [['h1', 'h2'], ['h2', 'h3'], ['h3', 'h4']]) {
    assert.ok(sizes.get(heading(bigger).sizeMd) > sizes.get(heading(smaller).sizeMd), `${bigger} > ${smaller}`);
  }
});

test('radius steps follow the shadcn/ui base radius', () => {
  const base = tokens.radius.find((r) => r.name === 'base').px;
  const px = Object.fromEntries(tokens.radius.map((r) => [r.name, r.px]));
  assert.deepEqual([px.sm, px.md, px.lg, px.xl], [base - 4, base - 2, base, base + 4]);
});

test('colors cover every shadcn/ui token and only six vary by app theme', () => {
  const colors = names(tokens.color.light);
  assert.equal(new Set(colors).size, colors.length);
  const shadcn = ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring', 'sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring'];
  for (const n of shadcn) assert.ok(colors.includes(n), n);
  assert.deepEqual(tokens.color.light.filter((c) => c.value === 'theme').map((c) => c.name), ['primary', 'primary-foreground', 'ring', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-ring']);
});

test('touch targets and the smallest screen are fixed', () => {
  assert.equal(tokens.responsive.touchTarget, '44px');
  assert.equal(tokens.responsive.minWidth, '360px');
});

test('the generated document lists every token and the workout-memo mapping', () => {
  const text = renderTokens(tokens);
  for (const s of tokens.textStyles) assert.ok(text.includes(`| \`${s.name}\` |`), s.name);
  for (const c of tokens.color.light) assert.ok(text.includes(`\`--${c.name}\``), c.name);
  assert.ok(text.includes('`--color-ink`'));
  const committed = fs.readFileSync(path.join(root, 'docs/design-tokens.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, text, 'run `npm run docs` after editing design/tokens.json');
});
