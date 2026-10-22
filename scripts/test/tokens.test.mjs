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

test('light and dark both cover every shadcn/ui token with the same names and no app theme slots', () => {
  const shadcn = ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring', 'sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring'];
  for (const mode of ['light', 'dark']) {
    const colors = names(tokens.color[mode]);
    assert.equal(new Set(colors).size, colors.length, mode);
    for (const n of shadcn) assert.ok(colors.includes(n), `${mode} ${n}`);
    assert.ok(tokens.color[mode].every((c) => /^oklch\(/.test(c.value)), `${mode}: every value is a fixed oklch color (ADR-0008)`);
  }
  assert.deepEqual(names(tokens.color.dark), names(tokens.color.light));
});

// WCAG contrast for achromatic oklch colors: with no chroma, linear sRGB = L^3 for all channels.
const luminance = (value) => {
  const m = /^oklch\(([\d.]+) 0 0\)$/.exec(value);
  if (!m) throw new Error(`not an achromatic oklch color: ${value}`);
  return Number(m[1]) ** 3;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('text and background pairs meet WCAG AA in both modes', () => {
  for (const mode of ['light', 'dark']) {
    const c = Object.fromEntries(tokens.color[mode].map((x) => [x.name, x.value]));
    for (const [fg, bg, min] of [['foreground', 'background', 7], ['muted-foreground', 'background', 4.5], ['primary-foreground', 'primary', 4.5], ['card-foreground', 'card', 7], ['sidebar-foreground', 'sidebar', 7], ['secondary-foreground', 'secondary', 4.5]]) {
      assert.ok(contrast(c[fg], c[bg]) >= min, `${mode} ${fg} on ${bg}: ${contrast(c[fg], c[bg]).toFixed(2)} < ${min}`);
    }
  }
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
