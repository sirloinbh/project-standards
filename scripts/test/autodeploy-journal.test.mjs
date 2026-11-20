// The autodeploy timer says what it decided without filling the journal: one line per change and one repeat an hour (#808).
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
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
    assert.match(text, /if ! flock -w "\$\{AUTODEPLOY_LOCK_WAIT:-100\}" 9; then\n {2}say "another deploy holds the lock \(\$\(cat "\$holder" 2> \/dev\/null \|\| echo unknown\)\); trying again on the next run"\n {2}exit 0\nfi/);
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

// A failed GitHub API call says so and signals, and the run ends with exit 0 so the next run tries again (#871).
test('a failed CI state request is reported, signalled and retried, not a silent failure', { skip: !(has('bash') && has('flock') && has('git') && has('python3')) && 'bash, flock, git or python3 not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-error-'));
  try {
    const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
    const origin = path.join(dir, 'origin.git');
    const work = path.join(dir, 'app');
    git(dir, 'init', '-q', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', posix(origin), posix(work));
    fs.mkdirSync(path.join(work, 'deploy'));
    fs.writeFileSync(path.join(work, 'deploy/notify.sh'), '#!/bin/bash\necho "$*" >> "$(dirname "$0")/../signals"\n');
    git(work, 'add', '.');
    git(work, 'commit', '-q', '-m', 'first');
    git(work, 'push', '-q', 'origin', 'HEAD:main');
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    // curl behaves as it does when GitHub refuses (HTTP 403 with -f) or answers with nothing.
    const fakeCurl = (body) => fs.writeFileSync(path.join(bin, 'curl'), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
    const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
    const script = path.join(dir, 'autodeploy.sh');
    fs.writeFileSync(script, `export PATH="${pathVar}"\n${app.replace(/^app=.*$/m, `app=${posix(work)}`).replace('/run/lock/apps-deploy.lock', `${posix(dir)}/lock`).replace('/run/lock/apps-deploy.holder', `${posix(dir)}/holder`)}`);
    const run = () => spawnSync('bash', [posix(script)], { encoding: 'utf8' });
    for (const body of ['echo "curl: (22) The requested URL returned error: 403" >&2; exit 22', 'exit 0']) {
      fs.rmSync(path.join(work, '.autodeploy-log'), { force: true });
      fs.rmSync(path.join(work, 'signals'), { force: true });
      fakeCurl(body);
      const r = run();
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /could not read the CI state of [0-9a-f]{12} from GitHub; trying again on the next run/);
      assert.match(fs.readFileSync(path.join(work, 'signals'), 'utf8'), /^ping deploy fail could not read the CI state of [0-9a-f]{12} from GitHub$/m);
      assert.ok(!fs.existsSync(path.join(work, '.autodeploy-failed')), 'a failed request does not mark the commit failed');
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A failed deploy keeps its output and sends the last lines with the fail signal, secrets masked (#872).
test('a failed deploy writes .last-deploy.log and signals the last lines with secret values masked', { skip: !(has('bash') && has('flock') && has('git') && has('python3')) && 'bash, flock, git or python3 not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-fail-'));
  try {
    const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
    const origin = path.join(dir, 'origin.git');
    const work = path.join(dir, 'app');
    git(dir, 'init', '-q', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', posix(origin), posix(work));
    fs.mkdirSync(path.join(work, 'deploy'));
    fs.writeFileSync(path.join(work, 'deploy/notify.sh'), '#!/bin/bash\necho "$*" >> "$(dirname "$0")/../signals"\n');
    fs.writeFileSync(path.join(work, 'deploy/remote-deploy.sh'), '#!/bin/bash\necho "migrating"\necho "NODE_AUTH_TOKEN=ghp_secretvalue in the log"\necho "ENOENT scandir /app/database/migrations/" >&2\nexit 1\n');
    git(work, 'add', '.');
    git(work, 'commit', '-q', '-m', 'first');
    git(work, 'push', '-q', 'origin', 'HEAD:main');
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'curl'), '#!/bin/bash\necho \'{"workflow_runs":[{"status":"completed","conclusion":"success","event":"push"}]}\'\n', { mode: 0o755 });
    const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
    const script = path.join(dir, 'autodeploy.sh');
    fs.writeFileSync(script, `export PATH="${pathVar}"\n${app.replace(/^app=.*$/m, `app=${posix(work)}`).replace('/run/lock/apps-deploy.lock', `${posix(dir)}/lock`).replace('/run/lock/apps-deploy.holder', `${posix(dir)}/holder`)}`);
    const r = spawnSync('bash', [posix(script)], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'a failed deploy still fails the run');
    const log = fs.readFileSync(path.join(work, '.last-deploy.log'), 'utf8');
    assert.match(log, /ENOENT scandir \/app\/database\/migrations\//);
    const signals = fs.readFileSync(path.join(work, 'signals'), 'utf8');
    assert.match(signals, /^ping deploy fail deploy of [0-9a-f]{12} failed\. Last lines of the deploy output:$/m);
    assert.match(signals, /ENOENT scandir \/app\/database\/migrations\//);
    assert.match(signals, /NODE_AUTH_TOKEN=\*\*\*/);
    assert.doesNotMatch(signals, /ghp_secretvalue/);
    assert.match(fs.readFileSync(path.join(work, '.autodeploy-failed'), 'utf8').trim(), /^[0-9a-f]{12}$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A busy lock is waited for, and a lock that stays busy names its holder (#899).
test('a busy lock is waited for, and a lock that stays busy says who holds it', { skip: !(has('bash') && has('flock') && has('git') && has('python3')) && 'bash, flock, git or python3 not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-wait-'));
  try {
    const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
    const origin = path.join(dir, 'origin.git');
    const work = path.join(dir, 'app');
    git(dir, 'init', '-q', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', posix(origin), posix(work));
    fs.mkdirSync(path.join(work, 'deploy'));
    fs.writeFileSync(path.join(work, 'deploy/notify.sh'), '#!/bin/bash\n');
    git(work, 'add', '.');
    git(work, 'commit', '-q', '-m', 'first');
    git(work, 'push', '-q', 'origin', 'HEAD:main');
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'curl'), '#!/bin/bash\necho \'{"workflow_runs":[]}\'\n', { mode: 0o755 });
    const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
    const script = path.join(dir, 'autodeploy.sh');
    fs.writeFileSync(script, `export PATH="${pathVar}"
${app.replace(/^app=.*$/m, `app=${posix(work)}`).replace('/run/lock/apps-deploy.lock', `${posix(dir)}/lock`).replace('/run/lock/apps-deploy.holder', `${posix(dir)}/holder`)}`);
    // Another app takes the lock for 3 seconds and names itself in the holder file.
    const hold = (seconds) => spawn('bash', ['-c', `exec 9> "${posix(dir)}/lock"; flock 9; echo other-app > "${posix(dir)}/holder"; sleep ${seconds}`], { stdio: 'ignore' });
    const run = (wait) => spawnSync('bash', [posix(script)], { encoding: 'utf8', env: { ...process.env, AUTODEPLOY_LOCK_WAIT: String(wait) } });
    const settle = () => spawnSync('bash', ['-c', 'sleep 1']);

    // Waits 20 s at most; the holder lets go after 3 s, so the run takes the lock and decides about the commit.
    let holder = hold(3);
    settle();
    let r = run(20);
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /holds the lock/);
    assert.match(r.stdout, /waiting for CI of [0-9a-f]{12}/);
    holder.kill();
    assert.ok(!fs.existsSync(path.join(dir, 'holder')) || fs.readFileSync(path.join(dir, 'holder'), 'utf8').trim() === 'other-app');

    // Still busy after the wait: the line names the holder and the run ends without error.
    fs.rmSync(path.join(work, '.autodeploy-log'), { force: true });
    fs.writeFileSync(path.join(dir, 'holder'), 'other-app\n');
    holder = hold(8);
    settle();
    r = run(1);
    holder.kill();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /another deploy holds the lock \(other-app\); trying again on the next run/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A red CI is looked at again every run; a failed deploy or a rollback is not (#925).
test('a green re-run of a commit whose CI failed deploys it; a failed deploy or rollback keeps waiting for a new commit', { skip: !(has('bash') && has('flock') && has('git') && has('python3')) && 'bash, flock, git or python3 not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-rerun-'));
  try {
    const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
    const origin = path.join(dir, 'origin.git');
    const work = path.join(dir, 'app');
    git(dir, 'init', '-q', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', posix(origin), posix(work));
    fs.mkdirSync(path.join(work, 'deploy'));
    fs.writeFileSync(path.join(work, 'deploy/notify.sh'), '#!/bin/bash\necho "$*" >> "$(dirname "$0")/../signals"\n');
    fs.writeFileSync(path.join(work, 'deploy/remote-deploy.sh'), '#!/bin/bash\necho "deploy $*" >> "$(dirname "$0")/../deploys"\n');
    git(work, 'add', '.');
    git(work, 'commit', '-q', '-m', 'first');
    git(work, 'push', '-q', 'origin', 'HEAD:main');
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    const runs = (conclusion) => fs.writeFileSync(path.join(bin, 'curl'), `#!/bin/bash\necho '{"workflow_runs":[{"status":"completed","conclusion":"${conclusion}","event":"push"}]}'\n`, { mode: 0o755 });
    const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
    const script = path.join(dir, 'autodeploy.sh');
    fs.writeFileSync(script, `export PATH="${pathVar}"\n${app.replace(/^app=.*$/m, `app=${posix(work)}`).replace('/run/lock/apps-deploy.lock', `${posix(dir)}/lock`).replace('/run/lock/apps-deploy.holder', `${posix(dir)}/holder`)}`);
    const run = () => spawnSync('bash', [posix(script)], { encoding: 'utf8' });
    const exists = (f) => fs.existsSync(path.join(work, f));
    const clearLog = () => fs.rmSync(path.join(work, '.autodeploy-log'), { force: true });

    runs('failure');
    let r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CI failed for [0-9a-f]{12}; not deploying/);
    assert.ok(exists('.autodeploy-failed') && exists('.autodeploy-ci-failed'));
    clearLog();
    r = run();
    assert.match(r.stdout, /CI of [0-9a-f]{12} is still red; waiting for a green re-run or a new commit on main/);
    assert.ok(exists('.autodeploy-failed') && !exists('deploys'), 'still red: nothing is deployed and the mark stays');

    runs('success');
    r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CI of [0-9a-f]{12} is green now; deploying/);
    assert.ok(!exists('.autodeploy-failed') && !exists('.autodeploy-ci-failed'), 'both marks are cleared');
    assert.match(fs.readFileSync(path.join(work, 'deploys'), 'utf8'), /^deploy deploy [0-9a-f]{40}$/m, 'the commit is deployed');

    // A mark without .autodeploy-ci-failed (a failed deploy, or a rollback) stays even when CI is green.
    fs.rmSync(path.join(work, 'deploys'));
    fs.writeFileSync(path.join(work, '.autodeploy-failed'), `${git(work, 'rev-parse', '--short=12', 'HEAD').stdout.trim()}\n`);
    clearLog();
    r = run();
    assert.match(r.stdout, /failed before; waiting for a new commit on main/);
    assert.ok(exists('.autodeploy-failed') && !exists('deploys'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
