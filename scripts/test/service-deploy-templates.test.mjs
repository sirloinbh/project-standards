// The shared services (shared-auth, shared-ai) get the same deploy files as the apps (#696).
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
const serviceTargets = data.sync.targets.filter((t) => t.profile === 'service');
const profile = data.sync.profiles.service;
const render = (target) =>
  Object.fromEntries(
    renderProfile({ root, profile: 'service', folders: profile.templates, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) })
      .filter((f) => f.path.startsWith('deploy/'))
      .map((f) => [f.path, f.content]),
  );
const rendered = Object.fromEntries(serviceTargets.map((t) => [t.repo.split('/').pop(), render(t)]));
const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;

const SERVICE_FILES = [
  'deploy/autodeploy.service',
  'deploy/autodeploy.sh',
  'deploy/autodeploy.timer',
  'deploy/backup.service',
  'deploy/backup.sh',
  'deploy/backup.timer',
  'deploy/deploy.sh',
  'deploy/install-autodeploy.sh',
  'deploy/install-backup.sh',
  'deploy/notify.sh',
  'deploy/remote-deploy.sh',
  'deploy/restore-check.service',
  'deploy/restore-check.timer',
  'deploy/ssm-get.sh',
];

test('both services get the shared deploy files, and no app-only health or report files', () => {
  assert.deepEqual(Object.keys(rendered).sort(), ['shared-ai', 'shared-auth']);
  for (const [name, files] of Object.entries(rendered)) {
    assert.deepEqual(Object.keys(files).sort(), SERVICE_FILES, name);
    for (const [file, text] of Object.entries(files)) {
      assert.doesNotMatch(text, /\{\{/, `${name} ${file}`);
      assert.ok(text.includes(HEADER_TEXT), `${name} ${file} has the managed header`);
    }
  }
});

test('the services keep the unit and folder names already installed on the server', () => {
  for (const [name, db] of [['shared-auth', 'auth'], ['shared-ai', 'ai']]) {
    const files = rendered[name];
    assert.match(files['deploy/install-autodeploy.sh'], new RegExp(`^unit=${name}-autodeploy$`, 'm'), name);
    assert.match(files['deploy/install-backup.sh'], new RegExp(`^prefix=${name}$`, 'm'), name);
    assert.match(files['deploy/install-backup.sh'], new RegExp(`^db=${db}$`, 'm'), name);
    assert.match(files['deploy/install-backup.sh'], /^units="backup restore-check"$/m, name);
    assert.match(files['deploy/autodeploy.sh'], new RegExp(`^repo=sirloinbh/${name}$`, 'm'), name);
    assert.match(files['deploy/autodeploy.sh'], new RegExp(`^app=/opt/${name}$`, 'm'), name);
    assert.match(files['deploy/backup.sh'], /^dir=\/var\/backups\/\$db$/m, name);
    assert.match(files['deploy/backup.sh'], new RegExp(`^db=${db}$`, 'm'), name);
  }
});

test('the service deploy has rollback, image pruning and a lock timeout, and the image runs the migrations', () => {
  for (const [name, files] of Object.entries(rendered)) {
    const script = files['deploy/remote-deploy.sh'];
    assert.match(script, new RegExp(`^cd /opt/${name}$`, 'm'), name);
    assert.match(script, /flock -w 1800 9/, name);
    assert.match(script, /^ {2}rollback\)$/m, name);
    assert.match(script, /health check failed for \$tag/, name);
    assert.match(script, new RegExp(`for image in ${name}-backend; do`), name);
    assert.match(script, /if \[ "image" = step \]; then/, name);
    assert.match(script, new RegExp(`^web_port=\\$\\{web_port:-${name === 'shared-auth' ? 8110 : 8111}\\}$`, 'm'), name);
    // The wrapper keeps an autodeploy.sh copy that started before the update working.
    assert.match(files['deploy/deploy.sh'], /exec bash deploy\/remote-deploy\.sh deploy "\$\(git rev-parse HEAD\)"/, name);
  }
});

test('the backup finds the database container by label, so a compose.yaml with required secrets still works', () => {
  for (const [name, files] of Object.entries(rendered)) {
    const script = files['deploy/backup.sh'];
    assert.doesNotMatch(script, /docker compose (exec|ps)/, name);
    assert.match(script, new RegExp(`label=com\\.docker\\.compose\\.project=${name} `), name);
  }
});

test('rendered service shell scripts pass bash -n', { skip: !has('bash') && 'bash not found' }, () => {
  for (const [name, files] of Object.entries(rendered)) {
    for (const [file, text] of Object.entries(files)) {
      if (!file.endsWith('.sh')) continue;
      const r = spawnSync('bash', ['-n'], { input: text, encoding: 'utf8' });
      assert.equal(r.status, 0, `${name} ${file}: ${r.stderr}`);
    }
  }
});

test('@required decides whether an unreadable SSM key stops the deploy', { skip: !has('bash') && 'bash not found' }, () => {
  const loader = rendered['shared-auth']['deploy/remote-deploy.sh'].match(/^ssm_keys\(\) \{[\s\S]*?^load_ssm_env\(\) \{[\s\S]*?^\}$/m)[0];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssm-required-'));
  const posix = (p) => p.split(path.sep).join('/');
  fs.mkdirSync(path.join(dir, 'deploy'));
  const example = ['# @desc Needed @required @secret @ssm=/sirloinbh/shared-auth/needed', 'NEEDED_KEY=', '# @desc Optional @secret @ssm=/sirloinbh/shared-auth/optional', 'OPTIONAL_KEY=', ''].join('\n');
  fs.writeFileSync(path.join(dir, '.env.example'), example);
  const run = ({ pair, fake }) => {
    fs.writeFileSync(path.join(dir, '.env'), pair ? 'SECRETS_AWS_ACCESS_KEY_ID=x\n' : '');
    fs.writeFileSync(path.join(dir, 'deploy/ssm-get.sh'), fake);
    fs.writeFileSync(path.join(dir, 'shared.env'), '');
    const script = `set -euo pipefail\n${loader}\nload_ssm_env\nprintf "%s|%s" "\${NEEDED_KEY:-unset}" "\${OPTIONAL_KEY:-unset}"\n`;
    fs.writeFileSync(path.join(dir, 'run.sh'), script);
    return spawnSync('bash', [posix(path.join(dir, 'run.sh'))], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NEEDED_KEY: '', OPTIONAL_KEY: '', STANDARDS_ENV_FILE: posix(path.join(dir, 'shared.env')) },
    });
  };
  try {
    const ok = run({ pair: true, fake: 'printf "v:%s" "$1"' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, 'v:/sirloinbh/shared-auth/needed|v:/sirloinbh/shared-auth/optional');
    // An unreadable optional key only warns; an unreadable required key stops the deploy.
    const optionalFails = run({ pair: true, fake: 'if [ "$1" = /sirloinbh/shared-auth/optional ]; then exit 1; fi; printf "v"' });
    assert.equal(optionalFails.status, 0, optionalFails.stderr);
    assert.match(optionalFails.stderr, /warning: could not read OPTIONAL_KEY/);
    const requiredFails = run({ pair: true, fake: 'exit 1' });
    assert.notEqual(requiredFails.status, 0);
    assert.match(requiredFails.stderr, /error: could not read NEEDED_KEY .*@required/);
    // Without a key pair, optional keys are skipped quietly and a required key stops the deploy.
    assert.notEqual(run({ pair: false, fake: 'exit 3' }).status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
