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
const DEPLOY_FILES = [
  'deploy/autodeploy.service',
  'deploy/autodeploy.sh',
  'deploy/autodeploy.timer',
  'deploy/backup.service',
  'deploy/backup.sh',
  'deploy/backup.timer',
  'deploy/install-autodeploy.sh',
  'deploy/install-backup.sh',
  'deploy/remote-deploy.sh',
  'deploy/restore-check.service',
  'deploy/restore-check.timer',
  'deploy/ssm-get.sh',
];

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
  assert.match(files['deploy/install-backup.sh'], /rm "\/etc\/cron\.d\/\$db-backup"/);
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

// Runs the rendered backup.sh with fake docker, curl and flock on PATH, in a temporary app folder.
function backupRun(args, { env = '', restored = 'public.a|2\npublic.b|5\n', setup, failCounts = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  const store = path.join(dir, 'store');
  for (const d of [bin, app, store]) fs.mkdirSync(d);
  const posix = (p) => p.split(path.sep).join('/');
  const script = rendered['study-log']['deploy/backup.sh']
    .replace('cd /opt/study-log', `cd '${posix(app)}'`)
    .replace('dir=/var/backups/$db', `dir='${posix(store)}'`)
    .replace('/run/lock/apps-backup.lock', `'${posix(dir)}/backup.lock'`);
  const tool = (name, lines) => fs.writeFileSync(path.join(bin, name), ['#!/bin/bash', ...lines, ''].join('\n'), { mode: 0o755 });
  tool('flock', ['exit 0']);
  tool('curl', ['echo "$*" >> "$FAKE_LOG.curl-args"', 'cat >> "$FAKE_LOG.curl-stdin"']);
  tool('docker', [
    'echo "$*" >> "$FAKE_LOG.docker"',
    'case "$1 $2" in',
    '  "compose exec") if [[ "$*" == *pg_dump* ]]; then echo "-- dump"; elif [ -n "$FAIL_COUNTS" ]; then exit 1; else printf "public.a|2\\npublic.b|5\\n"; fi ;;',
    '  "compose ps") echo cid ;;',
    '  "inspect --format") echo postgres:17 ;;',
    '  "exec -i") cat > /dev/null ;;',
    '  "exec "*) if [[ "$*" == *pg_isready* ]]; then exit 0; fi; printf "%b" "$RESTORED" ;;',
    'esac',
  ]);
  fs.writeFileSync(path.join(app, '.env'), env);
  setup?.({ app, store });
  const log = path.join(dir, 'log');
  // Git Bash on Windows takes a POSIX PATH; prepend the fake tools.
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; ${script.replace(/^#!.*\n/, '')}`, 'backup.sh', ...args], {
    encoding: 'utf8',
    env: { ...process.env, FAKE_LOG: posix(log), RESTORED: restored, FAIL_COUNTS: failCounts ? '1' : '' },
  });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const result = { status: r.status, stdout: r.stdout, stderr: r.stderr, files: fs.readdirSync(store).sort(), curlArgs: read('.curl-args'), curlStdin: read('.curl-stdin'), docker: read('.docker') };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}
const S3_ENV = 'BACKUP_S3_BUCKET=sirloinbh-backups\nBACKUP_AWS_ACCESS_KEY_ID=fake-id\nBACKUP_AWS_SECRET_ACCESS_KEY=fake-secret-value\n';
const canRunBackup = has('bash') && has('gzip');

test('backup dump writes the dump and row counts, and skips S3 without a bucket', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const r = backupRun(['dump']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.files.length, 2);
  assert.match(r.files[0], /^study-\d{4}-\d\d-\d\d-\d{6}\.counts$/);
  assert.match(r.files[1], /^study-\d{4}-\d\d-\d\d-\d{6}\.sql\.gz$/);
  assert.match(r.docker, /pg_dump --no-owner --no-privileges/);
  assert.match(r.stdout, /S3 upload skipped/);
  assert.equal(r.curlArgs, '');
  const labelled = backupRun(['dump', 'predeploy']);
  assert.match(labelled.files[1], /-predeploy\.sql\.gz$/);
  // A failed row count must not fail the dump, so a deploy is never blocked by it.
  const noCounts = backupRun(['dump'], { env: S3_ENV, failCounts: true });
  assert.equal(noCounts.status, 0, noCounts.stderr);
  assert.deepEqual(noCounts.files.map((f) => f.replace(/^study-[\d-]+/, '')), ['.sql.gz']);
  assert.match(noCounts.stderr, /row counts failed/);
  assert.equal(noCounts.curlArgs.trim().split('\n').length, 1, 'only the dump is uploaded');
});

test('backup dump copies both files to S3 and passes the key pair only on standard input', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const r = backupRun(['dump'], { env: S3_ENV });
  assert.equal(r.status, 0, r.stderr);
  const calls = r.curlArgs.trim().split('\n');
  assert.equal(calls.length, 2);
  assert.match(calls[0], /--aws-sigv4 aws:amz:ap-northeast-2:s3 .*https:\/\/sirloinbh-backups\.s3\.ap-northeast-2\.amazonaws\.com\/study-log\/study-.*\.sql\.gz$/);
  assert.match(calls[1], /\/study-log\/study-.*\.counts$/);
  assert.ok(!r.curlArgs.includes('fake-secret-value'), 'the secret must not be a curl argument');
  assert.ok(!(r.stdout + r.stderr).includes('fake-secret-value'), 'the secret must not be printed');
  assert.equal(r.curlStdin, 'user = "fake-id:fake-secret-value"\n'.repeat(2));
});

test('a bucket without keys keeps the local dump and exits 3, which a deploy accepts', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const r = backupRun(['dump'], { env: 'BACKUP_S3_BUCKET=sirloinbh-backups\n' });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /BACKUP_AWS_ACCESS_KEY_ID or BACKUP_AWS_SECRET_ACCESS_KEY is missing/);
  assert.equal(r.files.filter((f) => f.endsWith('.sql.gz')).length, 1);
  assert.match(rendered['study-log']['deploy/remote-deploy.sh'], /dump predeploy \|\| \[ \$\? -eq 3 \]/);
  const tolerated = spawnSync('bash', ['-c', 'set -e; f() { return 3; }; f || [ $? -eq 3 ]; echo went-on'], { encoding: 'utf8' });
  assert.equal(tolerated.stdout.trim(), 'went-on');
});

test('backup verify restores the newest dump and compares its row counts', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const seed = ({ store }) => {
    fs.writeFileSync(path.join(store, 'study-2026-10-26-033000.sql.gz'), spawnSync('gzip', ['-c'], { input: '-- dump\n' }).stdout);
    fs.writeFileSync(path.join(store, 'study-2026-10-26-033000.counts'), 'public.a|2\npublic.b|5\n');
  };
  const ok = backupRun(['verify'], { setup: seed });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /restore check passed: study-2026-10-26-033000\.sql\.gz, 2 tables/);
  assert.match(ok.docker, /run -d --rm --name study-restore-check .* postgres:17/);
  assert.match(ok.docker, /rm -f study-restore-check/);
  const bad = backupRun(['verify'], { setup: seed, restored: 'public.a|2\npublic.b|4\n' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /row counts of study-2026-10-26-033000\.sql\.gz differ/);
  const none = backupRun(['verify']);
  assert.equal(none.status, 1);
  assert.match(none.stderr, /no dump in/);
});

test('backup timers run nightly and weekly in Seoul time and the units copy the script first', () => {
  for (const [name, files] of Object.entries(rendered)) {
    const db = project(name).db.name;
    assert.match(files['deploy/backup.timer'], /^OnCalendar=\*-\*-\* 03:30:00 Asia\/Seoul$/m, name);
    assert.match(files['deploy/restore-check.timer'], /^OnCalendar=Sun \*-\*-\* 04:30:00 Asia\/Seoul$/m, name);
    assert.ok(files['deploy/backup.service'].includes(`cp /opt/${name}/deploy/backup.sh /tmp/${db}-backup.sh && exec /bin/bash /tmp/${db}-backup.sh dump`), name);
    assert.ok(files['deploy/restore-check.service'].includes(`/tmp/${db}-restore-check.sh verify`), name);
    assert.match(files['deploy/install-backup.sh'], new RegExp(`^db=${db}$`, 'm'), name);
  }
});

// python3 parses the SSM response on the server. Windows PCs often have only `python`.
const python = has('python3') ? 'python3' : has('python') ? 'python' : null;

// Runs the rendered ssm-get.sh with a fake curl that answers like SSM GetParameter.
function ssmRun(args, { env = '', response = '{"Parameter":{"Name":"/sirloinbh/anthropic-api-key","Value":"value-from-ssm"}}' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssm-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  for (const d of [bin, app]) fs.mkdirSync(d);
  const posix = (p) => p.split(path.sep).join('/');
  const tool = (name, lines) => fs.writeFileSync(path.join(bin, name), ['#!/bin/bash', ...lines, ''].join('\n'), { mode: 0o755 });
  tool('curl', ['echo "$*" >> "$FAKE_LOG.curl-args"', 'cat >> "$FAKE_LOG.curl-stdin"', 'printf "%s" "$RESPONSE"']);
  if (python !== 'python3') tool('python3', [`exec ${python} "$@"`]);
  fs.writeFileSync(path.join(app, '.env'), env);
  const script = rendered['study-log']['deploy/ssm-get.sh'].replace('cd /opt/study-log', `cd '${posix(app)}'`).replace(/^#!.*\n/, '');
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const log = path.join(dir, 'log');
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; ${script}`, 'ssm-get.sh', ...args], { encoding: 'utf8', env: { ...process.env, FAKE_LOG: posix(log), RESPONSE: response } });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const result = { status: r.status, stdout: r.stdout, stderr: r.stderr, curlArgs: read('.curl-args'), curlStdin: read('.curl-stdin') };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}
const SECRETS_ENV = 'SECRETS_AWS_ACCESS_KEY_ID=fake-reader-id\nSECRETS_AWS_SECRET_ACCESS_KEY=fake-reader-secret\n';

test('ssm-get signs a GetParameter call and prints only the value', { skip: !(has('bash') && python) && 'bash or python not found' }, () => {
  const r = ssmRun(['/sirloinbh/anthropic-api-key'], { env: SECRETS_ENV });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'value-from-ssm');
  assert.match(r.curlArgs, /--aws-sigv4 aws:amz:ap-northeast-2:ssm /);
  assert.match(r.curlArgs, /X-Amz-Target: AmazonSSM\.GetParameter/);
  assert.match(r.curlArgs, /--data \{"Name":"\/sirloinbh\/anthropic-api-key","WithDecryption":true\} https:\/\/ssm\.ap-northeast-2\.amazonaws\.com\/$/m);
  assert.ok(!r.curlArgs.includes('fake-reader-secret'), 'the secret must not be a curl argument');
  assert.equal(r.curlStdin, 'user = "fake-reader-id:fake-reader-secret"\n');
  assert.equal(r.stderr, '');
});

test('ssm-get refuses odd names and reports a missing key pair with exit 3', { skip: !(has('bash') && python) && 'bash or python not found' }, () => {
  const odd = ssmRun(['/x","WithDecryption":false,"a":"'], { env: SECRETS_ENV });
  assert.equal(odd.status, 2);
  assert.equal(odd.curlArgs, '');
  const missing = ssmRun(['/sirloinbh/anthropic-api-key']);
  assert.equal(missing.status, 3);
  assert.match(missing.stderr, /SECRETS_AWS_ACCESS_KEY_ID or SECRETS_AWS_SECRET_ACCESS_KEY is missing/);
  assert.equal(missing.stdout, '');
});

test('remote-deploy reads the Claude key from SSM only for apps with features.claude', { skip: !has('bash') && 'bash not found' }, () => {
  for (const [name, files] of Object.entries(rendered)) {
    assert.match(files['deploy/remote-deploy.sh'], new RegExp(`^if \\[ "${project(name).features.claude}" = true \\] && grep -q`, 'm'), name);
  }
  const text = rendered['study-log']['deploy/remote-deploy.sh'];
  const block = text.match(/^if \[ "true" = true \] && grep -q[\s\S]*?^fi$/m)[0];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-key-'));
  fs.mkdirSync(path.join(dir, 'deploy'));
  const run = (env, fake) => {
    fs.writeFileSync(path.join(dir, '.env'), env);
    fs.writeFileSync(path.join(dir, 'deploy/ssm-get.sh'), fake);
    return spawnSync('bash', ['-c', `set -euo pipefail\n${block}\nbash -c 'printf %s "\${ANTHROPIC_API_KEY:-unset}"'`], { cwd: dir, encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: '' } });
  };
  try {
    const ok = run(SECRETS_ENV, 'printf %s key-from-ssm');
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, 'key-from-ssm');
    const failed = run(SECRETS_ENV, 'exit 1');
    assert.equal(failed.status, 0, 'a failed SSM read must not stop the deploy');
    assert.match(failed.stderr, /could not read the Claude API key from SSM/);
    const noPair = run('ANTHROPIC_API_KEY=from-env-file\n', 'echo should-not-run; exit 9');
    assert.equal(noPair.status, 0);
    assert.equal(noPair.stdout, 'unset', 'without the key pair compose keeps reading .env');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
