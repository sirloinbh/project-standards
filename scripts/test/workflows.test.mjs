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
  // The pinned Windows runner is accepted only when versions.json names it (#165).
  const windows = ['permissions: {}', 'jobs:', '  a:', '    runs-on: windows-2025', '  b:', '    runs-on: windows-latest'].join('\n');
  assert.deepEqual(checkWorkflow('w.yml', windows, actions, runner, 'windows-2025'), [`w.yml:6: runs-on must be ${runner} or windows-2025 (versions.json runner), got windows-latest`]);
  assert.equal(checkWorkflow('w.yml', windows, actions, runner).length, 2);
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

// Both app CI jobs prepare the database with the vendored script (docs/conventions/database.md #27, #697 stage 2).
test('app CI runs the vendored migration script in the verify and e2e jobs and keeps no inline copy', () => {
  const text = fs.readFileSync(path.join(root, '.github/workflows/reusable-app-ci.yml'), 'utf8').replace(/\r\n/g, '\n');
  const steps = [...text.matchAll(/- name: DB migration\n(?: +#.*\n)* +run: (.*)\n/g)].map((m) => m[1]);
  assert.deepEqual(steps, ['bash .standards/ci-migrate.sh', 'bash .standards/ci-migrate.sh', 'npm run db:migrate'], 'verify and e2e use the script; e2e-visual (no psql in its image) runs the runner only');
  assert.doesNotMatch(text, /psql "\$DATABASE_URL"/, 'no inline psql loop is left');
  assert.doesNotMatch(text, /::warning title=DB migration::/, 'no runner-less fallback');
});

// #697: the vendored script reaches the apps and keeps the psql-then-runner order.
test('ci-migrate.sh is vendored to the app profile and keeps the psql-then-runner order (#697)', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/ci-migrate.sh'), 'utf8').replace(/\r\n/g, '\n');
  const firstPass = script.indexOf('psql "$DATABASE_URL" -v ON_ERROR_STOP=1');
  const runner = script.search(/^npm run db:migrate$/m);
  assert.ok(firstPass > 0 && runner > firstPass, 'psql pass (Docker init order) before the runner');
  assert.doesNotMatch(script, /::warning|package\.json/, 'no fallback for an app without the runner');
  assert.match(script, /^set -euo pipefail$/m);
  const index = JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8'));
  assert.deepEqual(index.vendor.files['.standards/ci-migrate.sh'], { from: 'scripts/ci-migrate.sh', profiles: ['app'] });
});

test('app CI runs once per commit and skips the slow jobs for docs-only pull requests (#699)', () => {
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
  // Triggers: main pushes and pull requests, not every push to every branch (a pull request branch ran twice).
  const caller = read('templates/app/.github/workflows/ci.yml.tmpl');
  assert.match(caller, /\non:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n/);
  assert.doesNotMatch(caller, /on: \[push, pull_request\]/);

  const text = read('.github/workflows/reusable-app-ci.yml');
  const job = (name) => new RegExp(`\n  ${name}:\n((?:    .*\n|\n)+)`).exec(text)?.[1] ?? '';
  // The changes job decides from the pull request's own diff; only pull_request events can be docs-only.
  const changes = job('changes');
  assert.match(changes, /fetch-depth: 2/);
  assert.match(changes, /\[ "\$EVENT" = pull_request \]/);
  assert.match(changes, /git diff --name-only HEAD\^1 HEAD/);
  assert.match(changes, /grep -qvE '\^docs\/\|\\.md\$'/);
  // The slow jobs wait for it and are skipped (which counts as passed for a required check) when only docs changed.
  // !cancelled() keeps them running if the changes job itself failed, so a failure cannot become a pass.
  for (const name of ['e2e', 'e2e-visual', 'docker-build']) {
    const body = job(name);
    assert.match(body, /needs: changes\n/, `${name} needs changes`);
    assert.match(body, /if: \$\{\{ !cancelled\(\) && .*needs\.changes\.outputs\.docs_only != 'true' \}\}/, `${name} is skipped for docs-only changes`);
  }
  // verify holds the format check, the standards check, and the docs tests, so it always runs.
  assert.doesNotMatch(job('verify'), /docs_only|needs:/);
});
