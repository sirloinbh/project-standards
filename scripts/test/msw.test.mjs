// Contract mock for screen tests (#281): the feature folder and which apps receive it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('only apps with openapi and vitest turn msw on, and workout-memo is the first', () => {
  const { projects } = JSON.parse(read('registry/projects.json'));
  const on = projects.filter((p) => p.features.msw);
  assert.deepEqual(on.map((p) => p.name), ['workout-memo']);
  for (const p of on) assert.ok(p.features.openapi && p.features.vitest, `${p.name} needs the contract and Vitest`);
  assert.equal(JSON.parse(read('sync.config.json')).profiles.app.featureTemplates.msw, 'msw');
});

test('the mock reads the contract, fails on requests outside it, and ships its own test', () => {
  const helper = read('templates/msw/frontend/src/test/contract-api.ts');
  assert.match(helper, /from '\.\.\/\.\.\/\.\.\/docs\/openapi\.json\?raw'/);
  assert.match(helper, /onUnhandledFrame: async/);
  assert.match(helper, /throw new Error\(`계약\(docs\/openapi\.json\)에 없는 요청/);
  // A use* name would trip react-hooks/rules-of-hooks at the top of a test file.
  assert.doesNotMatch(helper, /export function use[A-Z]/);
  assert.ok(fs.existsSync(path.join(root, 'templates/msw/frontend/src/test/contract-api.test.ts')));
});
