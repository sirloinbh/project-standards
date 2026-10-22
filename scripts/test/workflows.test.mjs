import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { changelogSection } from '../changelog-section.mjs';
import { checkAll, checkWorkflow } from '../check-workflows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { actions, runner } = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
const checkout = actions.checkout;

test('all committed workflows pin actions to versions.json SHAs and declare permissions', () => {
  assert.deepEqual(checkAll(root), []);
});

test('tags, wrong SHAs, unknown actions, missing comments, and missing permissions are reported', () => {
  const text = [
    'permissions: {}',
    'jobs:',
    '  a:',
    '    steps:',
    '      - uses: actions/checkout@v4',
    `      - uses: actions/checkout@${'0'.repeat(40)} # ${checkout.version}`,
    '      - uses: someone/action@abc',
    `      - uses: actions/checkout@${checkout.sha}`,
    `      - uses: actions/checkout@${checkout.sha} # ${checkout.version}`,
    '      - uses: ./.github/actions/local',
    '    uses: sirloinbh/project-standards/.github/workflows/reusable-app-ci.yml@abc',
  ].join('\n');
  assert.deepEqual(checkWorkflow('w.yml', text, actions), [
    `w.yml:5: actions/checkout must be pinned to ${checkout.sha} (${checkout.version}), got v4`,
    `w.yml:6: actions/checkout must be pinned to ${checkout.sha} (${checkout.version}), got ${'0'.repeat(40)}`,
    'w.yml:7: someone/action is not listed in versions.json actions',
    `w.yml:8: add the version comment "# ${checkout.version}"`,
  ]);
  assert.deepEqual(checkWorkflow('w.yml', 'on: push\n', actions), ['w.yml: top-level permissions are missing']);
});

test('runs-on must use the pinned runner from versions.json', () => {
  const text = ['permissions: {}', 'jobs:', '  a:', '    runs-on: ubuntu-latest', '  b:', `    runs-on: ${runner}`, '  c:', `    runs-on: '${runner}'`].join('\n');
  assert.deepEqual(checkWorkflow('w.yml', text, actions, runner), [`w.yml:4: runs-on must be ${runner} (versions.json runner), got ubuntu-latest`]);
  assert.deepEqual(checkWorkflow('w.yml', text, actions), [], 'no runner given: runs-on is not checked');
});

test('expressions inside run scripts are rejected; env, with, and if are fine', () => {
  const text = [
    'permissions: {}',
    'env:',
    '  TAG: ${{ github.ref_name }}',
    'jobs:',
    '  a:',
    '    if: inputs.e2e',
    '    steps:',
    "      - run: echo '${{ github.ref_name }}'",
    '      - run: |',
    '          tag="$TAG"',
    '          echo "${{ inputs.version }}"',
    '      - name: safe',
    '        with: { node-version: ${{ inputs.node-version }} }',
    '        run: echo "$TAG"',
  ].join('\n');
  assert.deepEqual(checkWorkflow('w.yml', text, actions), [
    'w.yml:8: ${{ }} inside a run script; pass it through env: instead',
    'w.yml:11: ${{ }} inside a run script; pass it through env: instead',
  ]);
});

test('publish.yml validates the tag format before using it', () => {
  const text = fs.readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');
  assert.match(text, /TAG: \$\{\{ github\.ref_name \}\}/);
  assert.ok(text.indexOf('=~ ^([a-z][a-z0-9-]*)/v') < text.indexOf('actions/checkout'), 'validate before checkout');
});

test('publish.yml triggers on package tags and checks the tag before publishing', () => {
  const text = fs.readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');
  assert.match(text, /tags: \['\*\/v\*'\]/);
  assert.match(text, /packages: write/);
  const guard = text.indexOf('package-guard.mjs --tag "$TAG"');
  const publish = text.indexOf('npm publish --ignore-scripts');
  const release = text.indexOf('gh release create');
  assert.ok(guard > 0 && publish > guard && release > publish, 'guard → publish → release order');
  assert.match(text, /RUN_URL: .*actions\/runs\/\$\{\{ github\.run_id \}\}/, 'release notes link the publish run');
});

test('changelogSection returns one version section', () => {
  const text = '# 변경 기록\n\n## 1.1.0\n\n- 새 규칙\n\n## 1.0.0\n\n- 첫 버전\n';
  assert.equal(changelogSection(text, '1.1.0'), '- 새 규칙');
  assert.equal(changelogSection(text, '1.0.0'), '- 첫 버전');
  assert.equal(changelogSection(text, '2.0.0'), null);
});

// Both app CI jobs prepare the database the same way (docs/conventions/database.md, #27).
test('app CI applies migrations with psql first, then the shared runner, in both jobs', () => {
  const text = fs.readFileSync(path.join(root, '.github/workflows/reusable-app-ci.yml'), 'utf8').replace(/\r\n/g, '\n');
  const steps = [...text.matchAll(/- name: DB 마이그레이션\n(?: +#.*\n)* +run: \|\n((?: {10}.*\n)+)/g)].map((m) => m[1]);
  assert.equal(steps.length, 2, 'verify and e2e jobs');
  assert.equal(steps[0], steps[1]);
  const script = steps[0];
  const firstPass = script.indexOf('psql "$DATABASE_URL" -v ON_ERROR_STOP=1');
  const runner = script.indexOf('npm run db:migrate');
  assert.ok(firstPass > 0 && runner > firstPass, 'psql pass (Docker init order) before the runner');
  assert.match(script, /::warning title=DB 마이그레이션::/, 'apps without the runner still pass, with a warning');
  assert.doesNotMatch(text, /^\s+- run: npm run db:migrate$/m, 'no unconditional runner call');
});
