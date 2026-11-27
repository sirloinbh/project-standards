// The utility profile (ADR-0029, #944): develop-skill and file-control receive only templates/common and .standards/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkAll, loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';
import { renderBody } from '../lib/sync-pr.mjs';
import { runCheck } from '../standards-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const loaded = loadAll(root);
const { data } = loaded;
const target = { repo: 'sirloinbh/file-control', profile: 'utility', project: null };
const plan = planTarget({ root, data, target, centralSha: 'a'.repeat(40) });
const paths = plan.files.map((f) => f.path);

test('the utility profile takes only the common folder and syncs no CI workflow', () => {
  assert.deepEqual(data.sync.profiles.utility, { templates: ['common'], packages: [], neverTouch: [] });
  assert.deepEqual(checkAll(loaded).errors, []);
});

test('a utility repo gets the shared agent files and the drift check', () => {
  for (const expected of [
    'skills/orca-lanes/SKILL.md',
    '.claude/skills/orca-lanes/SKILL.md',
    'skills/std-git-writing/SKILL.md',
    'skills/std-implementation/SKILL.md',
    '.claude/hooks/block-package-installs.mjs',
    '.claude/settings.json',
    '.codex/hooks.json',
    '.github/ISSUE_TEMPLATE/task.md',
    '.github/pull_request_template.md',
    '.editorconfig',
    '.gitattributes',
    '.gitignore',
    '.standards/check.mjs',
    '.standards/manifest.json',
  ]) assert.ok(paths.includes(expected), expected);
  const skill = plan.files.find((f) => f.path === 'skills/std-implementation/SKILL.md').content;
  assert.match(skill, /`sirloinbh\/file-control` repo/);
});

test('a utility repo gets no instructions, CI, tool versions, deploy, or app files', () => {
  const forbidden = [/^AGENTS\.md$/, /^CLAUDE\.md$/, /^\.claude\/rules\//, /^\.github\/workflows\//, /^\.github\/dependabot\.yml$/, /^\.nvmrc$/, /^\.node-version$/, /^\.npmrc$/, /^package\.json$/, /^eslint\.config\.mjs$/, /^deploy\//, /^frontend\//, /^backend\//, /^orca\.yaml$/, /^skills\/std-(foundation|testing|ux-audit)\//];
  for (const p of paths) for (const re of forbidden) assert.doesNotMatch(p, re);
  assert.deepEqual(plan.manifest.packages, {});
  assert.equal(plan.manifest.registry ?? null, null);
});

test('standards-check passes on a freshly synced utility repo and fails after a local edit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utility-'));
  try {
    for (const f of plan.files) {
      fs.mkdirSync(path.dirname(path.join(dir, f.path)), { recursive: true });
      fs.writeFileSync(path.join(dir, f.path), f.content);
    }
    // The repo's own files stay: a package.json with no dependencies, like file-control.
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'file-control', private: true, engines: { node: '>=22' } }));
    assert.deepEqual(runCheck(dir).problems, []);
    fs.appendFileSync(path.join(dir, 'skills/orca-lanes/SKILL.md'), '\nlocal edit\n');
    assert.deepEqual(runCheck(dir).problems.map((p) => p.path), ['skills/orca-lanes/SKILL.md']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the first sync PR asks about Claude settings the repo already had', () => {
  const base = { target, centralSha: 'a'.repeat(40), deletions: [], keptRemoved: [], packageNotes: [] };
  const replaced = [{ path: '.claude/settings.json', isNew: false, source: 'x' }];
  assert.match(renderBody({ ...base, changes: replaced, firstSync: true }), /`\.claude\/settings\.json` existed before this first sync/);
  assert.doesNotMatch(renderBody({ ...base, changes: replaced }), /existed before this first sync/);
  assert.doesNotMatch(renderBody({ ...base, changes: [{ ...replaced[0], isNew: true }], firstSync: true }), /existed before this first sync/);
  assert.doesNotMatch(renderBody({ ...base, changes: replaced, firstSync: true }), /deploys to production|terraform/);
});

// #1163: design-system is a sync target with the common folder and the three shared lint and TypeScript packages.
test('design-system receives the common files and the three shared config packages, no app files', () => {
  assert.deepEqual(data.sync.profiles['design-system'], {
    templates: ['common'],
    packages: ['@sirloinbh/eslint-config', '@sirloinbh/prettier-config', '@sirloinbh/tsconfig'],
    neverTouch: [],
  });
  const dsTarget = data.sync.targets.find((t) => t.repo === 'sirloinbh/design-system');
  assert.deepEqual([dsTarget.profile, dsTarget.project, dsTarget.wave], ['design-system', null, 1]);
  const dsPlan = planTarget({ root, data, target: dsTarget, centralSha: 'b'.repeat(40) });
  const dsPaths = dsPlan.files.map((f) => f.path);
  assert.ok(dsPaths.includes('skills/std-git-writing/SKILL.md'));
  assert.ok(dsPaths.includes('.standards/check.mjs'));
  for (const p of dsPaths) for (const re of [/^AGENTS\.md$/, /^frontend\//, /^backend\//, /^deploy\//]) assert.doesNotMatch(p, re);
  assert.deepEqual(Object.keys(dsPlan.manifest.packages), ['@sirloinbh/eslint-config', '@sirloinbh/prettier-config', '@sirloinbh/tsconfig']);
});

test('design-system holds registry slot 12 as a local repo with web 8112 and no subdomain', () => {
  const tool = data.projects.localTools.find((t) => t.name === 'design-system');
  assert.deepEqual([tool.slot, tool.ports], [12, { web: 8112 }]);
});
