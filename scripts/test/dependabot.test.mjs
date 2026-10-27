// templates/app/.github/dependabot.yml (#267): security updates only, grouped across the three
// lockfiles of an app into one minor/patch PR and one major PR.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const text = fs.readFileSync(path.join(root, 'templates/app/.github/dependabot.yml'), 'utf8');
// Top-level update entries, split on "  - package-ecosystem:".
const entries = text.split(/^ {2}- package-ecosystem: /m).slice(1);
const entry = (ecosystem) => entries.find((e) => e.startsWith(`${ecosystem}\n`));

test('one npm entry covers the root, frontend and backend lockfiles', () => {
  assert.equal(entries.filter((e) => e.startsWith('npm\n')).length, 1);
  const npm = entry('npm');
  assert.match(npm, /^ {4}directories:\n {6}- \/\n {6}- \/frontend\n {6}- \/backend\n/m);
  assert.doesNotMatch(npm, /^ {4}directory:/m, 'a single directory key would split PRs again');
});

test('version update PRs stay off for every ecosystem', () => {
  assert.equal(entries.length, 2);
  for (const e of entries) assert.match(e, /^ {4}open-pull-requests-limit: 0$/m);
  assert.ok(entry('github-actions'));
});

test('security updates are grouped into minor/patch and major', () => {
  const groups = entry('npm').split(/^ {4}groups:\n/m)[1];
  const minor = groups.match(/^ {6}security-minor-patch:\n((?: {8}.*\n)+)/m)?.[1];
  const major = groups.match(/^ {6}security-major:\n((?: {8}.*\n?)+)/m)?.[1];
  assert.ok(minor && major, 'both groups exist');
  for (const g of [minor, major]) {
    assert.match(g, /^ {8}applies-to: security-updates$/m);
    assert.match(g, /^ {8}patterns: \['\*'\]$/m);
  }
  assert.match(minor, /^ {8}update-types: \[minor, patch\]$/m);
  assert.match(major, /^ {8}update-types: \[major\]$/m);
});
