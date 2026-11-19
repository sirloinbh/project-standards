// The autodeploy timer says what it decided without filling the journal: one line per change and one repeat an hour (#808).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const render = (target) => {
  const folders = data.sync.profiles[target.profile].templates;
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return files.find((f) => f.path === 'deploy/autodeploy.sh').content;
};
const app = render(data.sync.targets.find((t) => t.project === 'study-log'));
const service = render(data.sync.targets.find((t) => t.repo === 'sirloinbh/shared-auth'));
const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
const posix = (p) => p.split(path.sep).join('/');

test('every silent exit now says something, and the fetched tip is read from FETCH_HEAD', () => {
  for (const text of [app, service]) {
    assert.match(text, /flock -n 9 \|\| \{ say "another deploy holds the lock; trying again on the next run"; exit 0; \}/);
    assert.match(text, /say "up to date at \$sha"/);
    assert.match(text, /say "waiting for CI of \$sha \(deployed: /);
    assert.match(text, /git fetch --quiet origin main\nfull=\$\(git rev-parse FETCH_HEAD\)/);
  }
});

test('say prints on a change and once an hour, not on every run', { skip: !has('bash') && 'bash not found' }, () => {
  const fn = app.match(/^say\(\) \{[\s\S]*?^\}$/m)[0];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'say-'));
  try {
    const script = path.join(dir, 'run.sh');
    fs.writeFileSync(script, `cd "$1"\n${fn}\nsay "$2"\n`);
    const run = (msg) => spawnSync('bash', [posix(script), posix(dir), msg], { encoding: 'utf8' }).stdout;
    assert.equal(run('waiting for CI of abc'), 'waiting for CI of abc\n');
    assert.equal(run('waiting for CI of abc'), '', 'the same decision stays quiet');
    assert.equal(run('up to date at abc'), 'up to date at abc\n', 'a change is printed');
    assert.equal(run('up to date at abc'), '');
    fs.writeFileSync(path.join(dir, '.autodeploy-log'), `${Math.floor(Date.now() / 1000) - 3700} up to date at abc\n`);
    assert.equal(run('up to date at abc'), 'up to date at abc\n', 'after an hour the line is repeated');
    fs.writeFileSync(path.join(dir, '.autodeploy-log'), 'garbage\n');
    assert.equal(run('up to date at abc'), 'up to date at abc\n', 'a damaged log file does not break the run');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
