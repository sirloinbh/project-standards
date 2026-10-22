import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { changelogSection } from '../changelog-section.mjs';
import { checkAll, checkWorkflow } from '../check-workflows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { actions } = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
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
    `      - uses: actions/checkout@${'0'.repeat(40)} # v4.4.0`,
    '      - uses: someone/action@abc',
    `      - uses: actions/checkout@${checkout.sha}`,
    `      - uses: actions/checkout@${checkout.sha} # ${checkout.version}`,
    '      - uses: ./.github/actions/local',
    '    uses: sirloinbh/project-standards/.github/workflows/reusable-app-ci.yml@abc',
  ].join('\n');
  assert.deepEqual(checkWorkflow('w.yml', text, actions), [
    `w.yml:5: actions/checkout must be pinned to ${checkout.sha} (v4.4.0), got v4`,
    `w.yml:6: actions/checkout must be pinned to ${checkout.sha} (v4.4.0), got ${'0'.repeat(40)}`,
    'w.yml:7: someone/action is not listed in versions.json actions',
    'w.yml:8: add the version comment "# v4.4.0"',
  ]);
  assert.deepEqual(checkWorkflow('w.yml', 'on: push\n', actions), ['w.yml: top-level permissions are missing']);
});

test('publish.yml triggers on package tags and checks the tag before publishing', () => {
  const text = fs.readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');
  assert.match(text, /tags: \['\*\/v\*'\]/);
  assert.match(text, /packages: write/);
  const guard = text.indexOf("package-guard.mjs --tag '${{ github.ref_name }}'");
  const publish = text.indexOf('npm publish --ignore-scripts');
  const release = text.indexOf('gh release create');
  assert.ok(guard > 0 && publish > guard && release > publish, 'guard → publish → release order');
  assert.match(text, /actions\/runs\/\$\{\{ github\.run_id \}\}/, 'release notes link the publish run');
});

test('changelogSection returns one version section', () => {
  const text = '# 변경 기록\n\n## 1.1.0\n\n- 새 규칙\n\n## 1.0.0\n\n- 첫 버전\n';
  assert.equal(changelogSection(text, '1.1.0'), '- 새 규칙');
  assert.equal(changelogSection(text, '1.0.0'), '- 첫 버전');
  assert.equal(changelogSection(text, '2.0.0'), null);
});
