// The apps' ESLint config bans `interface` (@typescript-eslint/consistent-type-definitions: 'type',
// packages/eslint-config/index.mjs, #243). Managed TypeScript is copied into every app, so one `interface`
// here fails lint in every sync PR. This reads the sources instead of running ESLint, which this repo does not install.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sources(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(full));
    else if (/\.(ts|tsx|ts\.tmpl|tsx\.tmpl)$/.test(entry.name)) found.push(full);
  }
  return found;
}

test('no managed or scaffold TypeScript declares an interface (use type)', () => {
  const offenders = [];
  for (const folder of ['templates', 'scaffold']) {
    for (const file of sources(path.join(root, folder))) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(export\s+)?(default\s+)?(declare\s+)?interface\s+\w/.test(line)) {
          offenders.push(`${path.relative(root, file).replaceAll('\\', '/')}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
  assert.deepEqual(offenders, []);
});

test('the check sees an interface declaration (the pattern is not dead)', () => {
  const pattern = /^\s*(export\s+)?(default\s+)?(declare\s+)?interface\s+\w/;
  assert.ok(pattern.test('export interface Options {'));
  assert.ok(pattern.test('  interface Props extends Base {'));
  assert.ok(!pattern.test('export type Options = {'));
  assert.ok(!pattern.test('// an interface for the app'));
});
