import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { apply, buildDrill, databasesOf, quarterOf } from '../restore-drill.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const registry = JSON.parse(read('registry/projects.json'));

test('quarterOf maps each month to its quarter and rejects bad dates', () => {
  assert.equal(quarterOf('2026-01-01'), '2026-Q1');
  assert.equal(quarterOf('2026-04-01'), '2026-Q2');
  assert.equal(quarterOf('2026-07-01'), '2026-Q3');
  assert.equal(quarterOf('2026-10-01'), '2026-Q4');
  assert.throws(() => quarterOf('2026-1-1'), /YYYY-MM-DD/);
});

test('databasesOf lists apps and shared services that have a database and skips the others', () => {
  const found = databasesOf({ projects: [{ name: 'a', db: { name: 'adb' } }, { name: 'b' }], sharedServices: [{ name: 's', db: { name: 'sdb' } }] });
  assert.deepEqual(found, [{ name: 'a', db: 'adb' }, { name: 's', db: 'sdb' }]);
});

test('the drill body has a checkbox for every app and shared service with a database', () => {
  const { title, body } = buildDrill(registry, '2026-10-01');
  assert.equal(title, 'Quarterly restore drill 2026-Q4');
  const expected = databasesOf(registry);
  assert.equal(expected.length, registry.projects.length + registry.sharedServices.length);
  for (const { name, db } of expected) assert.match(body, new RegExp(`- \\[ \\] \\*\\*${name}\\*\\*: newest \`${db}-\\*\\.sql\\.gz\``));
  assert.equal(body.match(/^- \[ \] \*\*/gm).length, expected.length);
  assert.match(body, /postgres:17-alpine/);
  assert.doesNotMatch(body, /undefined/);
});

test('an empty registry is an error', () => {
  assert.throws(() => buildDrill({ projects: [] }, '2026-10-01'), /no database/);
});

test('apply creates the issue once and does nothing when the title exists', () => {
  const calls = [];
  const drill = { title: 'Quarterly restore drill 2026-Q4', body: 'body' };
  const none = (args) => (calls.push(args), args[1] === 'list' ? '[]' : 'https://example.test/1\n');
  assert.deepEqual(apply(drill, 'o/r', none), { created: true, url: 'https://example.test/1' });
  assert.equal(calls.at(-1)[1], 'create');
  calls.length = 0;
  const exists = (args) => (calls.push(args), JSON.stringify([{ number: 7, title: drill.title, url: 'https://example.test/7' }]));
  assert.deepEqual(apply(drill, 'o/r', exists), { created: false, url: 'https://example.test/7' });
  assert.equal(calls.length, 1);
});

test('the dry run prints the issue for a given date', () => {
  const out = spawnSync('node', [path.join(root, 'scripts/restore-drill.mjs'), '--dry-run', '--date', '2027-01-01'], { encoding: 'utf8' });
  assert.equal(out.status, 0);
  assert.match(out.stdout, /^Quarterly restore drill 2027-Q1\n/);
  assert.match(out.stdout, /\*\*workout-memo\*\*/);
  assert.match(out.stdout, /\*\*shared-ai\*\*/);
});

test('the workflow runs on the first day of each quarter and is permission-scoped', () => {
  const wf = read('.github/workflows/restore-drill.yml');
  assert.match(wf, /cron: '0 0 1 1,4,7,10 \*'/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /issues: write/);
  assert.match(wf, /node scripts\/restore-drill\.mjs --apply/);
});

test('the runbook has a Quarterly drill section', () => {
  assert.match(read('docs/runbooks/backup-restore.md'), /^## Quarterly drill/m);
});
