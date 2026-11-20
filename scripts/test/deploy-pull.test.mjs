// remote-deploy.sh can pull the images CI pushed to GHCR instead of building them, off by default (ADR-0023, #755).
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
const renderDeploy = (target) => {
  const folders = data.sync.profiles[target.profile].templates;
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return files.find((f) => f.path === 'deploy/remote-deploy.sh').content;
};
const app = renderDeploy(data.sync.targets.find((t) => t.project === 'study-log'));
// What the registry says for study-log: the rollout (#757, #928) switches projects on one at a time, so the checks follow it.
const appState = data.projects.projects.find((p) => p.name === 'study-log').ghcr?.pull === true ? 'on' : 'off';
const service = renderDeploy(data.sync.targets.find((t) => t.repo === 'sirloinbh/shared-auth'));
const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;

test('pulling follows the registry (study-log as the registry says, on for shared-auth), and a failed pull falls back to the build', () => {
  for (const [text, state] of [[app, appState], [service, 'on']]) {
    const lines = [`if [ "${state}" = on ] && pull_images "$tag"; then`, '      echo "pulled $tag from ghcr.io/sirloinbh"', '    else', '      IMAGE_TAG="$tag" docker compose build', '    fi'];
    assert.ok(text.includes(lines.join('\n')), `${state}: pull block`);
  }
});

test('rollback takes an optional commit tag and pulls it when pulling is on', () => {
  assert.match(app, /previous=\$\{2:-\$\(cat \.previous 2>\/dev\/null \|\| true\)\}/);
  assert.match(app, new RegExp(String.raw`if \[ -n "\$\{2:-\}" \] && \[ "${appState}" = on \]; then\n {6}git fetch --quiet --tags origin\n {6}pull_images "\$previous"`));
  assert.match(app, /usage: remote-deploy\.sh deploy <git ref> \| rollback \[tag\]/);
});

// Runs pull_images with a fake docker that records its calls.
function pullRun(text, { token = 'ghp_fake', failPull = false } = {}) {
  const fn = text.match(/^pull_images\(\) \{[\s\S]*?^\}$/m)[0];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-'));
  const posix = (p) => p.split(path.sep).join('/');
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const log = path.join(dir, 'log');
  fs.writeFileSync(
    path.join(bin, 'docker'),
    ['#!/bin/bash', 'echo "$*" >> "$FAKE_LOG"', 'if [ "$1" = login ]; then cat >> "$FAKE_LOG.stdin"; fi', 'if [ "$1" = pull ] && [ -n "$FAIL_PULL" ]; then exit 1; fi', ''].join('\n'),
    { mode: 0o755 },
  );
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const script = path.join(dir, 'run.sh');
  fs.writeFileSync(script, `export PATH="${pathVar}"\nset -euo pipefail\n${fn}\npull_images abc123def456\n`);
  const r = spawnSync('bash', [posix(script)], {
    encoding: 'utf8',
    env: { ...process.env, NODE_AUTH_TOKEN: token, FAKE_LOG: posix(log), FAIL_PULL: failPull ? '1' : '' },
  });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const out = { status: r.status, stderr: r.stderr, calls: read(''), stdin: read('.stdin') };
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

test('pull_images logs in with the token on stdin, pulls each image and tags it with the local name', { skip: !has('bash') && 'bash not found' }, () => {
  const r = pullRun(app);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdin, 'ghp_fake');
  assert.doesNotMatch(r.calls, /ghp_fake/, 'the token is never an argument');
  assert.match(r.calls, /^login ghcr\.io -u sirloinbh --password-stdin$/m);
  assert.match(r.calls, /^pull --quiet ghcr\.io\/sirloinbh\/study-backend:abc123def456$/m);
  assert.match(r.calls, /^tag ghcr\.io\/sirloinbh\/study-frontend:abc123def456 study-frontend:abc123def456$/m);
  const svc = pullRun(service);
  assert.equal(svc.status, 0, svc.stderr);
  assert.match(svc.calls, /^pull --quiet ghcr\.io\/sirloinbh\/shared-auth-backend:abc123def456$/m);
  assert.doesNotMatch(svc.calls, /frontend/);
});

test('pull_images fails, so the deploy builds, when there is no token or a pull fails', { skip: !has('bash') && 'bash not found' }, () => {
  const noToken = pullRun(app, { token: '' });
  assert.notEqual(noToken.status, 0);
  assert.equal(noToken.calls, '', 'docker is not called without a token');
  const failed = pullRun(app, { failPull: true });
  assert.notEqual(failed.status, 0);
  assert.doesNotMatch(failed.calls, /^tag /m);
});

// The registry switches `ghcr.push` and `ghcr.pull` turn the image move on per project; both default to off (#757).
const renderFiles = (registryData, target) => {
  const folders = registryData.sync.profiles[target.profile].templates;
  return Object.fromEntries(renderProfile({ root, profile: target.profile, folders, vars: buildVars(registryData, target, { centralSha: 'abcdef1234567' }) }).map((f) => [f.path, f.content]));
};

test('push and pull follow the registry switches and are off for a project that has none', () => {
  const entries = [...data.projects.projects, ...(data.projects.sharedServices ?? [])];
  for (const target of data.sync.targets.filter((t) => t.profile === 'app' || t.profile === 'service')) {
    const entry = entries.find((e) => (target.project ? e.name === target.project : e.repo === target.repo.split('/').pop()));
    const files = renderFiles(data, target);
    assert.match(files['.github/workflows/ci.yml'], new RegExp(`^ {6}push-images: ${entry.ghcr?.push === true}$`, 'm'), target.repo);
    assert.match(files['deploy/remote-deploy.sh'], new RegExp(String.raw`if \[ "${entry.ghcr?.pull === true ? 'on' : 'off'}" = on \] && pull_images`), target.repo);
  }
  // Moving one project at a time (#757, #928): every app and service pushes; the projects in the list below pull, nothing else until the user says otherwise.
  const pushing = entries.filter((e) => e.ghcr?.push).map((e) => e.name);
  assert.equal(pushing.length, entries.length, 'every app and service pushes (#920)');
  assert.deepEqual(entries.filter((e) => e.ghcr?.pull).map((e) => e.name).sort(), ['cert-manager', 'dev-career-portfolio', 'health-log', 'life-journal', 'money-ledger', 'plan-routine', 'shared-ai', 'shared-auth', 'study-log', 'workout-memo']);
});

test('ghcr.push and ghcr.pull in the registry turn the CI push and the deploy pull on for that project only (health-log has no switch here)', () => {
  const copy = structuredClone(data);
  copy.projects.projects.find((p) => p.name === 'study-log').ghcr = { push: true, pull: true };
  copy.projects.sharedServices.find((s) => s.repo === 'shared-auth').ghcr = { push: true };
  const study = renderFiles(copy, copy.sync.targets.find((t) => t.project === 'study-log'));
  assert.match(study['.github/workflows/ci.yml'], /^ {6}push-images: true$/m);
  assert.match(study['deploy/remote-deploy.sh'], /if \[ "on" = on \] && pull_images/);
  const auth = renderFiles(copy, copy.sync.targets.find((t) => t.repo === 'sirloinbh/shared-auth'));
  assert.match(auth['.github/workflows/ci.yml'], /^ {6}push-images: true$/m);
  assert.match(auth['deploy/remote-deploy.sh'], /if \[ "off" = on \] && pull_images/, 'push alone does not turn pulling on');
  delete copy.projects.projects.find((p) => p.name === 'health-log').ghcr;
  const other = renderFiles(copy, copy.sync.targets.find((t) => t.project === 'health-log'));
  assert.match(other['.github/workflows/ci.yml'], /^ {6}push-images: false$/m);
});

// The cleanup after a deploy removes old tags of both names a pulled image has (#870).
test('the image cleanup removes old tags under the local name and the ghcr.io name, and keeps the current and previous', () => {
  const start = app.indexOf('    keep="$tag|');
  const end = app.indexOf('    # Repeated deploys must not grow the disk');
  assert.ok(start > 0 && end > start, 'the cleanup block is in the rendered script');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  const posix = (p) => p.split(path.sep).join('/');
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const log = path.join(dir, 'log');
  // `image ls <repo>` lists the current, the previous and one old tag for every repository; `image rm` is recorded.
  fs.writeFileSync(path.join(bin, 'docker'), ['#!/bin/bash', 'if [ "$1 $2" = "image ls" ]; then printf "new1\nprev1\nold1\n"; else echo "$*" >> "$FAKE_LOG"; fi', ''].join('\n'), { mode: 0o755 });
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const script = path.join(dir, 'run.sh');
  fs.writeFileSync(script, `export PATH="${pathVar}"\nset -euo pipefail\ntag=new1\ncd "${posix(dir)}"\necho prev1 > .previous\n${app.slice(start, end)}\n`);
  const r = spawnSync('bash', [posix(script)], { encoding: 'utf8', env: { ...process.env, FAKE_LOG: posix(log) } });
  assert.equal(r.status, 0, r.stderr);
  const removed = fs.readFileSync(log, 'utf8').trim().split('\n').sort();
  fs.rmSync(dir, { recursive: true, force: true });
  const expected = ['study-backend', 'study-frontend'].flatMap((image) => [`image rm ${image}:old1`, `image rm ghcr.io/sirloinbh/${image}:old1`]).sort();
  assert.deepEqual(removed, expected);
});
