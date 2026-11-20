// templates/app/.github/dependabot.yml (#267): security updates only, grouped into one minor/patch PR and one major PR.
// An app has one lockfile, the root one (ADR-0022, #729).
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

test('one npm entry covers the root lockfile only', () => {
  assert.equal(entries.filter((e) => e.startsWith('npm\n')).length, 1);
  const npm = entry('npm');
  assert.match(npm, /^ {4}directory: \/$/m);
  assert.doesNotMatch(npm, /\/frontend|\/backend/, 'the sub-lockfiles are gone (#729)');
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
