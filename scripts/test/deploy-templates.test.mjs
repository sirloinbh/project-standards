// Deploy script templates (#36, ADR-0009): one Lightsail server, one compose project per app.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { HEADER_TEXT } from '../lib/render.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const appTargets = data.sync.targets.filter((t) => t.profile === 'app');
const render = (target) => {
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return Object.fromEntries(files.filter((f) => f.path.startsWith('deploy/')).map((f) => [f.path, f.content]));
};
const rendered = Object.fromEntries(appTargets.map((t) => [t.project, render(t)]));
const project = (name) => data.projects.projects.find((p) => p.name === name);
const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
const DEPLOY_FILES = ['deploy/autodeploy.service', 'deploy/autodeploy.sh', 'deploy/autodeploy.timer', 'deploy/install-autodeploy.sh', 'deploy/remote-deploy.sh'];

test('every app gets the same five deploy files with no unfilled variable', () => {
  for (const [name, files] of Object.entries(rendered)) {
    assert.deepEqual(Object.keys(files).sort(), DEPLOY_FILES, name);
    for (const [file, text] of Object.entries(files)) {
      assert.doesNotMatch(text, /\{\{/, `${name} ${file}`);
      assert.ok(text.includes(HEADER_TEXT), `${name} ${file} has the managed header`);
    }
  }
});

test('workout-memo renders to the names its running server already uses', () => {
  // The server has workout-autodeploy.timer, /usr/local/bin/workout-backup and WEB_PORT=80 in
  // .env, so syncing these files must not need a unit rename or a port change there.
  const files = rendered['workout-memo'];
  assert.match(files['deploy/install-autodeploy.sh'], /^unit=workout-autodeploy$/m);
  assert.match(files['deploy/autodeploy.sh'], /^repo=sirloinbh\/workout-memo$/m);
  assert.match(files['deploy/autodeploy.sh'], /^app=\/opt\/workout-memo$/m);
  assert.match(files['deploy/remote-deploy.sh'], /^cd \/opt\/workout-memo$/m);
  assert.match(files['deploy/remote-deploy.sh'], /\/usr\/local\/bin\/workout-backup/);
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

test('autodeploy deploys only when every check run passed', { skip: !(has('bash') && has('python3')) && 'bash or python3 not found' }, () => {
  const script = rendered['study-log']['deploy/autodeploy.sh'];
  const state = (runs) => spawnSync('bash', ['-c', script, 'autodeploy.sh', 'ci-state'], { input: JSON.stringify({ check_runs: runs }), encoding: 'utf8' }).stdout.trim();
  const run = (status, conclusion) => ({ status, conclusion });
  assert.equal(state([]), 'pending');
  assert.equal(state([run('completed', 'success'), run('in_progress', null)]), 'pending');
  assert.equal(state([run('completed', 'success'), run('completed', 'skipped'), run('completed', 'neutral')]), 'pass');
  assert.equal(state([run('completed', 'success'), run('completed', 'failure')]), 'fail');
  assert.equal(state([run('completed', 'cancelled')]), 'fail');
});
