// A design-system release is checked against every app before the pin moves (#1178).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { appMatrix, checkApp, pinChanged, summary, verifyRelease } from '../release-app-check.mjs';
import { loadAll } from '../lib/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const SHA = 'a'.repeat(40);
const versions = (pin) => JSON.stringify({ 'design-system': pin });

test('only a pin that gets a version and differs from the base starts the check', () => {
  const none = { repo: 'sirloinbh/design-system', version: null, sha: null };
  const one = { repo: 'sirloinbh/design-system', version: '1.0.0', sha: SHA };
  assert.equal(pinChanged(versions(none), versions(one)), true);
  assert.equal(pinChanged(versions(one), versions(one)), false);
  assert.equal(pinChanged(versions(one), versions({ ...one, version: '1.1.0', sha: 'b'.repeat(40) })), true);
  assert.equal(pinChanged(versions(one), versions(none)), false);
  assert.equal(pinChanged('{}', versions(one)), true);
});

test('the matrix lists the 8 apps with their repositories', () => {
  const matrix = appMatrix(data);
  assert.equal(matrix.length, 8);
  assert.deepEqual(matrix[0], { app: 'workout-memo', repo: 'sirloinbh/workout-memo' });
});

test('the pinned commit needs a green design-system check', async () => {
  const pin = { repo: 'sirloinbh/design-system', version: '1.0.0', sha: SHA };
  const answer = (runs, ok = true, status = 200) => async () => ({ ok, status, json: async () => ({ check_runs: runs }) });
  assert.deepEqual(await verifyRelease({ pin, fetchImpl: answer([{ name: 'check', conclusion: 'success' }]) }), []);
  assert.match((await verifyRelease({ pin, fetchImpl: answer([{ name: 'check', conclusion: 'failure' }]) }))[0], /is failure/);
  assert.match((await verifyRelease({ pin, fetchImpl: answer([{ name: 'check', conclusion: null, status: 'in_progress' }]) }))[0], /is in_progress/);
  assert.match((await verifyRelease({ pin, fetchImpl: answer([]) }))[0], /has no `check` run/);
  assert.match((await verifyRelease({ pin, fetchImpl: answer([], false, 404) }))[0], /404/);
  assert.match((await verifyRelease({ pin: { ...pin, version: null }, fetchImpl: answer([]) }))[0], /no version/);
});

const fixture = () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'release-check-'));
  const calls = [];
  const clone = (repo, dir) => {
    calls.push(`clone ${repo}`);
    fs.mkdirSync(dir, { recursive: true });
  };
  return { work, calls, clone };
};

test('an app gets this checkout\'s sync files, then installs, typechecks and tests its frontend', () => {
  const { work, calls, clone } = fixture();
  try {
    const run = (command, args) => {
      calls.push([command, ...args].join(' '));
      return { ok: true, output: '' };
    };
    const result = checkApp({ data, app: 'workout-memo', work, clone, run });
    assert.deepEqual(result, { app: 'workout-memo', ok: true });
    assert.deepEqual(calls, ['clone sirloinbh/workout-memo', 'npm install --ignore-scripts --no-audit --no-fund', 'npm run typecheck -w frontend', 'npm run test -w frontend']);
    assert.ok(fs.existsSync(path.join(work, 'workout-memo', '.standards/manifest.json')));
    assert.ok(fs.existsSync(path.join(work, 'workout-memo', 'frontend/src/components/ui/button.tsx')));
    assert.match(summary({ pin: { version: '1.0.0' }, result }), /passed/);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test('a broken typecheck stops that app and names the step and the end of the output', () => {
  const { work, clone } = fixture();
  try {
    const output = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
    const run = (command, args) => (args.includes('typecheck') ? { ok: false, output: `${output}\nerror TS2322: Type 'string' is not assignable` } : { ok: true, output: '' });
    const result = checkApp({ data, app: 'study-log', work, clone, run });
    assert.equal(result.ok, false);
    assert.equal(result.step, 'frontend typecheck');
    assert.match(result.tail, /TS2322/);
    assert.equal(result.tail.split('\n').length, 40);
    const text = summary({ pin: { version: '2.0.0' }, result });
    assert.match(text, /design-system v2\.0\.0 on study-log: failed/);
    assert.match(text, /Failed at \*\*frontend typecheck\*\*/);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  assert.throws(() => checkApp({ data, app: 'nope', work: os.tmpdir(), clone: () => {} }), /unknown app/);
});

test('the workflow runs on pin changes, reports every app, and keeps one always-passing gate job', () => {
  const text = fs.readFileSync(path.join(root, '.github/workflows/design-system-release-check.yml'), 'utf8');
  // A path filter would stop the workflow from starting, and a required check would stay "Expected" on every other PR.
  assert.ok(!/^\s+paths:/m.test(text), 'no paths filter');
  assert.match(text, /on:\n\s+pull_request:\n\s+permissions:/);
  assert.match(text, /fail-fast: false/);
  assert.match(text, /design-system-release-check:\n\s+needs: \[detect, app\]\n\s+if: always\(\)/);
  assert.ok(!text.includes('pull-requests: write'), 'the check never writes to the PR');
});
