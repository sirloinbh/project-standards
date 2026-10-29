// knip in app CI (#263, #342): central files are not app findings, and only apps at zero fail CI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { APP_CI } from '../lib/inline-ci.mjs';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('knip skips the central files every app receives', () => {
  const { ignore } = JSON.parse(read('templates/app/knip.json'));
  for (const pattern of ['.standards/**', '.claude/**', 'backend/src/standard/**', 'frontend/src/components/ui/**']) assert.ok(ignore.includes(pattern), pattern);
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
