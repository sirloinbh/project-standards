// Deploy script templates: rendering, shell syntax, autodeploy, and remote-deploy network (#36, ADR-0009).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { HEADER_TEXT } from '../lib/render.mjs';
import { appTargets, rendered, project, has, DEPLOY_FILES } from './deploy-helpers.mjs';

test('every app gets the same deploy files with no unfilled variable', () => {
  for (const [name, files] of Object.entries(rendered)) {
    assert.deepEqual(Object.keys(files).sort(), DEPLOY_FILES, name);
    for (const [file, text] of Object.entries(files)) {
      assert.doesNotMatch(text, /\{\{/, `${name} ${file}`);
      assert.ok(text.includes(HEADER_TEXT), `${name} ${file} has the managed header`);
    }
  }
});

test('workout-memo renders to the names its running server already uses', () => {
  // The server has workout-autodeploy.timer, dumps in /var/backups/workout from a cron job and
  // WEB_PORT=80 in .env, so syncing these files must not need a unit rename or a port change there.
  const files = rendered['workout-memo'];
  assert.match(files['deploy/install-autodeploy.sh'], /^unit=workout-autodeploy$/m);
  assert.match(files['deploy/autodeploy.sh'], /^repo=sirloinbh\/workout-memo$/m);
  assert.match(files['deploy/autodeploy.sh'], /^app=\/opt\/workout-memo$/m);
  assert.match(files['deploy/remote-deploy.sh'], /^cd \/opt\/workout-memo$/m);
  assert.match(files['deploy/remote-deploy.sh'], /bash deploy\/backup\.sh dump predeploy \|\| \[ \$\? -eq 3 \]/);
  assert.match(files['deploy/backup.sh'], /^dir=\/var\/backups\/\$db$/m);
  assert.match(files['deploy/backup.sh'], /^db=workout$/m);
  assert.match(files['deploy/install-backup.sh'], /rm "\/etc\/cron\.d\/\$prefix-backup"/);
  assert.match(files['deploy/remote-deploy.sh'], /for image in workout-backend workout-frontend; do/);
  assert.match(files['deploy/remote-deploy.sh'], /^web_port=\$\{web_port:-8101\}$/m);
  assert.match(files['deploy/autodeploy.service'], /cp \/opt\/workout-memo\/deploy\/autodeploy\.sh \/tmp\/workout-autodeploy\.sh/);
});

test('apps share one deploy lock and pass it from the timer to the deploy script', () => {
  for (const [name, files] of Object.entries(rendered)) {
    for (const file of ['deploy/autodeploy.sh', 'deploy/remote-deploy.sh']) assert.match(files[file], /exec 9> \/run\/lock\/apps-deploy\.lock/, `${name} ${file}`);
    assert.match(files['deploy/autodeploy.sh'], /APPS_DEPLOY_LOCKED=1 bash deploy\/remote-deploy\.sh deploy/, name);
    assert.match(files['deploy/remote-deploy.sh'], /if \[ -z "\$\{APPS_DEPLOY_LOCKED:-\}" \]; then/, name);
  }
});

test('each app uses its registry values and a boot delay offset by slot', () => {
  const delays = new Set();
  for (const [name, files] of Object.entries(rendered)) {
    const p = project(name);
    assert.match(files['deploy/install-autodeploy.sh'], new RegExp(`^unit=${p.db.name}-autodeploy$`, 'm'));
    assert.match(files['deploy/remote-deploy.sh'], new RegExp(`^web_port=\\$\\{web_port:-${p.ports.web}\\}$`, 'm'));
    assert.match(files['deploy/remote-deploy.sh'], new RegExp(`for image in ${p.db.name}-backend ${p.db.name}-frontend; do`));
    const delay = files['deploy/autodeploy.timer'].match(/^OnBootSec=(.+)$/m)[1];
    assert.equal(delay, `3min ${p.slot}0s`, name);
    delays.add(delay);
  }
  assert.equal(delays.size, appTargets.length, 'no two apps start their checks together');
});

test('the docker image tag format survives rendering as a Go template', () => {
  const text = rendered['study-log']['deploy/remote-deploy.sh'];
  assert.match(text, /tag_format='\{''\{\.Tag\}\}'/);
  if (has('bash')) assert.equal(spawnSync('bash', ['-c', `${text.match(/tag_format=.*$/m)[0]}; printf %s "$tag_format"`], { encoding: 'utf8' }).stdout, '{{.Tag}}');
});

test('remote-deploy exports the server .env package token for the compose build secret', { skip: !has('bash') && 'bash not found' }, () => {
  const text = rendered['study-log']['deploy/remote-deploy.sh'];
  const block = text.match(/^if \[ -z "\$\{NODE_AUTH_TOKEN:-\}" \]; then\n[\s\S]*?^export NODE_AUTH_TOKEN=.*$/m)[0];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'remote-deploy-'));
  // A child process sees the value only when it was exported.
  const run = (env, extra = {}) => {
    fs.writeFileSync(path.join(dir, '.env'), env);
    const r = spawnSync('bash', ['-c', `${block}\nbash -c 'printf %s "$NODE_AUTH_TOKEN"'`], { cwd: dir, encoding: 'utf8', env: { ...process.env, NODE_AUTH_TOKEN: '', ...extra } });
    return r.stdout;
  };
  try {
    assert.equal(run('POSTGRES_PASSWORD=x\nNODE_AUTH_TOKEN=dummy-a\n'), 'dummy-a');
    assert.equal(run('NODE_AUTH_TOKEN="dummy-b"\r\nWEB_PORT=8101\r\n'), 'dummy-b');
    assert.equal(run('POSTGRES_PASSWORD=x\n'), '');
    assert.equal(run('NODE_AUTH_TOKEN=from-file\n', { NODE_AUTH_TOKEN: 'from-env' }), 'from-env');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rendered shell scripts pass bash -n', { skip: !has('bash') && 'bash not found' }, () => {
  for (const [name, files] of Object.entries(rendered)) {
    for (const [file, text] of Object.entries(files)) {
      if (!file.endsWith('.sh')) continue;
      const r = spawnSync('bash', ['-n'], { input: text, encoding: 'utf8' });
      assert.equal(r.status, 0, `${name} ${file}: ${r.stderr}`);
    }
  }
});

test('autodeploy deploys only when every workflow run of the repository passed', { skip: !(has('bash') && has('python3')) && 'bash or python3 not found' }, () => {
  const script = rendered['study-log']['deploy/autodeploy.sh'];
  assert.ok(script.includes('actions/runs?head_sha=$full'), 'autodeploy reads workflow runs');
  const state = (runs) => spawnSync('bash', ['-c', script, 'autodeploy.sh', 'ci-state'], { input: JSON.stringify({ workflow_runs: runs }), encoding: 'utf8' }).stdout.trim();
  const run = (status, conclusion, event = 'push') => ({ status, conclusion, event });
  assert.equal(state([]), 'pending');
  assert.equal(state([run('completed', 'success'), run('in_progress', null)]), 'pending');
  assert.equal(state([run('completed', 'success'), run('completed', 'skipped'), run('completed', 'neutral')]), 'pass');
  assert.equal(state([run('completed', 'success'), run('completed', 'failure')]), 'fail');
  assert.equal(state([run('completed', 'cancelled')]), 'fail');
  // #417: Dependabot updates and CodeQL default setup run as event "dynamic" and do not count.
  assert.equal(state([run('completed', 'success'), run('completed', 'failure', 'dynamic')]), 'pass');
  assert.equal(state([run('completed', 'success'), run('in_progress', null, 'dynamic')]), 'pass');
  assert.equal(state([run('completed', 'failure', 'dynamic')]), 'pending');
  assert.equal(state([run('completed', 'failure'), run('completed', 'success', 'dynamic')]), 'fail');
});


test('autodeploy signals every decision and the health timer runs every 5 minutes', () => {
  for (const [name, files] of Object.entries(rendered)) {
    const auto = files['deploy/autodeploy.sh'];
    assert.match(auto, /^signal\(\) \{ if \[ -f deploy\/notify\.sh \]; then bash deploy\/notify\.sh ping deploy "\$@" \|\| true; fi; \}$/m, name);
    for (const s of ['signal ok "up to date at $sha"', 'signal fail "$sha failed before', 'signal ok "waiting for CI of $sha"', 'signal fail "CI failed for $sha"', 'signal ok "deployed $sha"', 'signal fail "deploy of $sha failed"']) assert.ok(auto.includes(s), `${name}: ${s}`);
    assert.match(files['deploy/health.timer'], /^OnUnitActiveSec=5min$/m, name);
    assert.ok(files['deploy/health.service'].includes(`/tmp/${project(name).db.name}-notify.sh health`), name);
    assert.match(files['deploy/install-backup.sh'], /^units="backup restore-check health report"$/m, name);
  }
});


test('remote-deploy creates the shared-ai network before compose uses it, only when compose.yaml joins it (#611)', { skip: !has('bash') && 'bash not found' }, () => {
  const text = rendered['study-log']['deploy/remote-deploy.sh'];
  const fn = text.match(/^ensure_networks\(\) \{[\s\S]*?^\}$/m)[0];
  assert.match(text, /save_api_errors\n {2}ensure_networks\n {2}IMAGE_TAG="\$1" docker compose up -d --wait db/, 'the start path (rollback) creates it before up');
  assert.match(text, /ensure_networks\n {4}IMAGE_TAG="\$tag" docker compose up -d --wait db/, 'the deploy path creates it before up and the migration run');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'networks-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const posix = (p) => p.split(path.sep).join('/');
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const calls = path.join(dir, 'calls.txt');
  const docker = (exists) => fs.writeFileSync(path.join(bin, 'docker'), ['#!/bin/bash', `echo "$@" >> '${posix(calls)}'`, `[ "$2" = inspect ] && exit ${exists ? 0 : 1}`, 'exit 0', ''].join('\n'), { mode: 0o755 });
  const run = () => spawnSync('bash', ['-c', `set -euo pipefail; export PATH="${pathVar}"; ${fn}\nensure_networks; echo done`], { cwd: dir, encoding: 'utf8' });
  const logged = () => (fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n') : []);
  try {
    docker(false);
    fs.writeFileSync(path.join(dir, 'compose.yaml'), 'networks:\n  shared-auth:\n    external: true\n');
    assert.equal(run().status, 0);
    assert.deepEqual(logged(), [], 'an app that has not joined shared-ai makes no docker call');
    fs.writeFileSync(path.join(dir, 'compose.yaml'), 'networks:\n  shared-ai:\n    name: shared-ai\n    external: true\n');
    assert.equal(run().status, 0);
    assert.deepEqual(logged(), ['network inspect shared-ai', 'network create shared-ai']);
    fs.rmSync(calls);
    docker(true);
    assert.equal(run().status, 0);
    assert.deepEqual(logged(), ['network inspect shared-ai'], 'an existing network is kept');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
