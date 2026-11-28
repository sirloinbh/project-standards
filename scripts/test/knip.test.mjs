// knip in app CI (#263, #342): central files are not app findings, and only apps at zero fail CI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { APP_CI } from '../lib/inline-ci.mjs';
import { loadAll } from '../lib/registry.mjs';
import { addKnipIgnores, kitKnipIgnores, planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('knip skips the central files every app receives', () => {
  const { ignore } = JSON.parse(read('templates/app/knip.json'));
  for (const pattern of ['.standards/**', '.claude/**', 'backend/src/standard/**', 'frontend/src/components/ui/**']) assert.ok(ignore.includes(pattern), pattern);
});

test('knip reads the backend node:test files and lets the root e2e specs use workspace dependencies (#657)', () => {
  const config = JSON.parse(read('templates/app/knip.json'));
  assert.deepEqual(config.workspaces.backend.entry, ['test/**/*.test.ts']);
  assert.deepEqual(config.ignoreIssues['e2e/**'], ['unlisted']);
});

test('the shared CI warns on knip findings unless the app is strict, and then fails', () => {
  const ci = read('.github/workflows/reusable-app-ci.yml');
  assert.match(ci, /if: hashFiles\('knip\.json'\) != '' && !inputs\.knip-strict\n\s+run: npm run knip \|\| echo "::warning/);
  assert.match(ci, /if: hashFiles\('knip\.json'\) != '' && inputs\.knip-strict\n\s+run: npm run knip\n/);
});

test('features.knipStrict reaches the app CI, both called and inlined', () => {
  const { data } = loadAll(root);
  const ciOf = (project) =>
    planTarget({ root, data, target: data.sync.targets.find((t) => t.project === project), centralSha: 'a'.repeat(40) }).files.find((f) => f.path === APP_CI).content;
  const strict = (p) => data.projects.projects.find((x) => x.name === p).features.knipStrict;
  // study-log calls the reusable workflow; workout-memo (public) gets it inlined with the value filled in.
  assert.ok(ciOf('study-log').includes(`knip-strict: ${strict('study-log')}\n`));
  assert.ok(ciOf('workout-memo').includes(`if: hashFiles('knip.json') != '' && !${strict('workout-memo')}\n`));
});

test('knip skips the delivered UI kit code: one pattern per component folder, exact paths otherwise (#1233)', () => {
  const files = [
    { path: 'frontend/src/components/chart/chart.tsx', source: 'design-system/delivery/ui/frontend/src/components/chart/chart.tsx' },
    { path: 'frontend/src/components/chart/chart-data.ts', source: 'design-system/delivery/ui/frontend/src/components/chart/chart-data.ts' },
    { path: 'frontend/src/components/ui/button.tsx', source: 'design-system/delivery/ui/frontend/src/components/ui/button.tsx' },
    { path: 'frontend/src/sign-in.tsx', source: 'templates/ui/frontend/src/sign-in.tsx' },
    { path: 'frontend/src/components/search/search.md', source: 'design-system/delivery/ui/frontend/src/components/search/search.md' },
    { path: 'knip.json', source: 'templates/app/knip.json' },
  ];
  const patterns = kitKnipIgnores(files);
  assert.deepEqual(patterns, ['frontend/src/components/chart/**', 'frontend/src/components/ui/**', 'frontend/src/sign-in.tsx']);

  const template = read('templates/app/knip.json');
  const out = addKnipIgnores(template, patterns);
  const { ignore } = JSON.parse(out);
  assert.deepEqual(ignore.slice(-2), ['frontend/src/components/chart/**', 'frontend/src/sign-in.tsx']);
  assert.equal(ignore.filter((p) => p === 'frontend/src/components/ui/**').length, 1, 'an entry the template has is not repeated');
  // One string per line with the template's indentation, so the apps' Prettier check keeps passing.
  assert.match(out, /\n    "e2e\/support\/\*\*",\n    "frontend\/src\/components\/chart\/\*\*",\n    "frontend\/src\/sign-in\.tsx"\n  \],/);
  assert.equal(addKnipIgnores(template, ['frontend/src/components/ui/**']), template, 'nothing to add keeps the text');
  assert.throws(() => addKnipIgnores('{ "ignore": [".standards/**"] }', ['a.ts']), /one string per line/);
});

test('a UI app gets knip.json with its kit folders after the template entries (#1233)', () => {
  const { data } = loadAll(root);
  const knipOf = (project) =>
    planTarget({ root, data, target: data.sync.targets.find((t) => t.project === project), centralSha: 'a'.repeat(40) }).files.find((f) => f.path === 'knip.json')?.content;
  const { ignore } = JSON.parse(knipOf('health-log'));
  assert.ok(ignore.includes('frontend/src/components/layout/**'));
  assert.ok(ignore.includes('frontend/src/sign-in.tsx'));
  assert.ok(ignore.indexOf('e2e/support/**') < ignore.indexOf('frontend/src/components/layout/**'), 'added after the template entries');
});
