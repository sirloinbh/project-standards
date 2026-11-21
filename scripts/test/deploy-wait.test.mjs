// remote-deploy.sh waits on Compose health (`up -d --wait`) and still rolls back when the new version is not healthy (#963).
// Runs the rendered script with fake docker, git, curl, sleep and flock in a temp dir; nothing touches a real server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadAll } from '../lib/registry.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
const posix = (p) => p.split(path.sep).join('/');
const NEW = 'newcommit0001';
const OLD = 'oldcommit0001';

function renderDeploy(target) {
  const folders = data.sync.profiles[target.profile].templates;
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return files.find((f) => f.path === 'deploy/remote-deploy.sh').content;
}

// unhealthy: 'compose' makes `up -d --wait` of the new tag fail, as it does when the api healthcheck never passes.
function deploy(text, { unhealthy = null, withPrevious = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(app, 'deploy'), { recursive: true });
  const script = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  script('docker', 'echo "docker $* [IMAGE_TAG=${IMAGE_TAG:-}]" >> "$FAKE_LOG"\nif [ "$1 $2 $3" = "compose up -d" ] && [[ "$*" == *--wait* ]] && [[ "$*" != *" db"* ]] && [ "$FAKE_UNHEALTHY" = compose ] && [ "$IMAGE_TAG" = "$NEW_TAG" ]; then exit 1; fi\nexit 0');
  script('git', 'echo "git $*" >> "$FAKE_LOG"\nif [ "$1" = rev-parse ]; then echo "$NEW_TAG"; fi\nexit 0');
  script('curl', 'echo "curl $*" >> "$FAKE_LOG"\nexit 0');
  script('sleep', 'exit 0');
  fs.writeFileSync(path.join(app, '.env'), '');
  fs.writeFileSync(path.join(app, 'deploy', 'backup.sh'), '#!/bin/bash\nexit 0\n');
  if (withPrevious) fs.writeFileSync(path.join(app, '.deployed'), `${OLD}\n`);
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const rendered = text.replace(/^cd \/opt\/\S+$/m, 'cd "$APP_DIR"');
  const scriptFile = path.join(dir, 'remote-deploy.sh');
  fs.writeFileSync(scriptFile, rendered);
  const log = path.join(dir, 'log');
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; bash '${posix(scriptFile)}' deploy main`], {
    encoding: 'utf8',
    env: { ...process.env, APPS_DEPLOY_LOCKED: '1', APP_DIR: posix(app), FAKE_LOG: posix(log), FAKE_UNHEALTHY: unhealthy ?? '', NEW_TAG: NEW, OLD_TAG: OLD, STANDARDS_ENV_FILE: posix(path.join(dir, 'none.env')) },
  });
  const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
  const out = { status: r.status, stderr: r.stderr, calls: read(log) ?? '', deployed: read(path.join(app, '.deployed'))?.trim() ?? null, previous: read(path.join(app, '.previous'))?.trim() ?? null };
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

const targets = ['study-log', 'workout-memo'].map((p) => data.sync.targets.find((t) => t.project === p)).concat(data.sync.targets.filter((t) => t.profile === 'service'));

test('the deploy waits for Compose health instead of polling and records the new tag on success', { skip: !has('bash') && 'bash not found' }, () => {
  for (const target of targets) {
    const r = deploy(renderDeploy(target));
    assert.equal(r.status, 0, `${target.repo}: ${r.stderr}`);
    assert.match(r.calls, new RegExp(`docker compose up -d --wait --wait-timeout 180 .IMAGE_TAG=${NEW}.`), target.repo);
    assert.doesNotMatch(r.calls, /docker compose up -d \[/, `${target.repo}: no up without --wait`);
    assert.equal(r.deployed, NEW, target.repo);
    assert.equal(r.previous, OLD, target.repo);
  }
});

test('a failing Compose health check rolls back to the previous commit and leaves .deployed alone (test copy only)', { skip: !has('bash') && 'bash not found' }, () => {
  const r = deploy(renderDeploy(targets[0]), { unhealthy: 'compose' });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /health check failed for newcommit0001/);
  assert.match(r.stderr, /restored oldcommit0001/);
  assert.match(r.calls, new RegExp(`git checkout --quiet --detach ${OLD}`), 'the previous commit is checked out again');
  assert.match(r.calls, new RegExp(`up -d --wait --wait-timeout 180 .IMAGE_TAG=${OLD}.`), 'and its images are started');
  assert.equal(r.deployed, OLD, '.deployed still names the previous commit');
  assert.equal(r.previous, null);
});

test('a first deploy that is unhealthy fails without a rollback target', { skip: !has('bash') && 'bash not found' }, () => {
  const r = deploy(renderDeploy(targets[0]), { unhealthy: 'compose', withPrevious: false });
  assert.equal(r.status, 1, r.stderr);
  assert.doesNotMatch(r.stderr, /restored/);
  assert.equal(r.deployed, null);
});
