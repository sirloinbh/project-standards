// Lighthouse CI trial (#280): only apps with features.lighthouse get lighthouserc.json, and the CI step only warns.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('lighthouserc measures the built frontend and every assertion is a warning', () => {
  const { ci } = JSON.parse(read('templates/lighthouse/lighthouserc.json'));
  assert.equal(ci.collect.staticDistDir, './frontend/dist');
  const assertions = Object.entries(ci.assert.assertions);
  assert.deepEqual(assertions.map(([k]) => k).sort(), ['categories:accessibility', 'categories:best-practices', 'categories:performance']);
  for (const [name, [level, { minScore }]] of assertions) {
    assert.equal(level, 'warn', `${name} must not fail CI`);
    assert.ok(minScore > 0 && minScore <= 1, name);
  }
  // Reports stay in the job (artifact), never on a public upload server.
  assert.equal(ci.upload.target, 'filesystem');
});

test('only workout-memo turns the trial on, and the feature maps to the template folder', () => {
  const { projects } = JSON.parse(read('registry/projects.json'));
  assert.deepEqual(projects.filter((p) => p.features.lighthouse).map((p) => p.name), ['workout-memo']);
  const sync = JSON.parse(read('sync.config.json'));
  assert.equal(sync.profiles.app.featureTemplates.lighthouse, 'lighthouse');
});

test('the shared app CI runs Lighthouse only with lighthouserc.json and never fails on it', () => {
  const ci = read('.github/workflows/reusable-app-ci.yml');
  const step = ci.slice(ci.indexOf('name: 접근성·성능 점수'), ci.indexOf('name: 배포 스크립트 문법 검사'));
  assert.match(step, /if: hashFiles\('lighthouserc\.json'\) != ''/);
  assert.match(step, /node_modules\/\.bin\/lhci autorun \|\| echo "::warning title=Lighthouse CI::/);
  assert.match(step, /if: always\(\) && steps\.lighthouse\.outcome != 'skipped'/);
});
