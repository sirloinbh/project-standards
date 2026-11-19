// Deploy script templates: ssm-get.sh and the @ssm= key export of remote-deploy.sh (ADR-0014).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { data, rendered, project, has } from './deploy-helpers.mjs';

// python3 parses the SSM response on the server. Windows PCs often have only `python`.
const python = has('python3') ? 'python3' : has('python') ? 'python' : null;

// Runs the rendered ssm-get.sh with a fake curl that answers like SSM GetParameter.
function ssmRun(args, { env = '', shared = null, response = '{"Parameter":{"Name":"/sirloinbh/shared/anthropic-api-key","Value":"value-from-ssm"}}' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssm-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  for (const d of [bin, app]) fs.mkdirSync(d);
  const posix = (p) => p.split(path.sep).join('/');
  const tool = (name, lines) => fs.writeFileSync(path.join(bin, name), ['#!/bin/bash', ...lines, ''].join('\n'), { mode: 0o755 });
  tool('curl', ['echo "$*" >> "$FAKE_LOG.curl-args"', 'cat >> "$FAKE_LOG.curl-stdin"', 'printf "%s" "$RESPONSE"']);
  if (python !== 'python3') tool('python3', [`exec ${python} "$@"`]);
  fs.writeFileSync(path.join(app, '.env'), env);
  const sharedFile = path.join(dir, 'shared.env');
  if (shared !== null) fs.writeFileSync(sharedFile, shared);
  const script = rendered['study-log']['deploy/ssm-get.sh'].replace('cd /opt/study-log', `cd '${posix(app)}'`).replace(/^#!.*\n/, '');
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const log = path.join(dir, 'log');
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; ${script}`, 'ssm-get.sh', ...args], { encoding: 'utf8', env: { ...process.env, FAKE_LOG: posix(log), RESPONSE: response, STANDARDS_ENV_FILE: posix(sharedFile) } });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const result = { status: r.status, stdout: r.stdout, stderr: r.stderr, curlArgs: read('.curl-args'), curlStdin: read('.curl-stdin') };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}
const SECRETS_ENV = 'SECRETS_AWS_ACCESS_KEY_ID=fake-reader-id\nSECRETS_AWS_SECRET_ACCESS_KEY=fake-reader-secret\n';

test('ssm-get signs a GetParameter call and prints only the value', { skip: !(has('bash') && python) && 'bash or python not found' }, () => {
  const r = ssmRun(['/sirloinbh/shared/anthropic-api-key'], { env: SECRETS_ENV });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'value-from-ssm');
  assert.match(r.curlArgs, /--aws-sigv4 aws:amz:ap-northeast-2:ssm /);
  assert.match(r.curlArgs, /X-Amz-Target: AmazonSSM\.GetParameter/);
  assert.match(r.curlArgs, /--data \{"Name":"\/sirloinbh\/shared\/anthropic-api-key","WithDecryption":true\} https:\/\/ssm\.ap-northeast-2\.amazonaws\.com\/$/m);
  assert.ok(!r.curlArgs.includes('fake-reader-secret'), 'the secret must not be a curl argument');
  assert.equal(r.curlStdin, 'user = "fake-reader-id:fake-reader-secret"\n');
  assert.equal(r.stderr, '');
});

test('ssm-get takes the key pair from the shared server file, and it wins over the app .env', { skip: !(has('bash') && python) && 'bash or python not found' }, () => {
  const r = ssmRun(['/sirloinbh/shared/anthropic-api-key'], { shared: SECRETS_ENV, env: 'SECRETS_AWS_ACCESS_KEY_ID=old-id\nSECRETS_AWS_SECRET_ACCESS_KEY=old-secret\n' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'value-from-ssm');
  assert.equal(r.curlStdin, 'user = "fake-reader-id:fake-reader-secret"\n');
});

test('ssm-get refuses odd names and reports a missing key pair with exit 3', { skip: !(has('bash') && python) && 'bash or python not found' }, () => {
  const odd = ssmRun(['/x","WithDecryption":false,"a":"'], { env: SECRETS_ENV });
  assert.equal(odd.status, 2);
  assert.equal(odd.curlArgs, '');
  const missing = ssmRun(['/sirloinbh/shared/anthropic-api-key']);
  assert.equal(missing.status, 3);
  assert.match(missing.stderr, /SECRETS_AWS_ACCESS_KEY_ID or SECRETS_AWS_SECRET_ACCESS_KEY is missing/);
  assert.equal(missing.stdout, '');
});

test('remote-deploy exports every @ssm= tagged key, and the Claude key for apps with features.claude', { skip: !has('bash') && 'bash not found' }, () => {
  const loader = (name) => rendered[name]['deploy/remote-deploy.sh'].match(/^ssm_keys\(\) \{[\s\S]*?^load_ssm_env\(\) \{[\s\S]*?^\}$/m)[0];
  for (const [name, files] of Object.entries(rendered)) {
    assert.match(files['deploy/remote-deploy.sh'], new RegExp(`^  if \\[ "${project(name).features.claude}" = true \\] && ! printf`, 'm'), name);
    // Both the deploy and start paths read the keys after checking out the commit they start.
    assert.equal((files['deploy/remote-deploy.sh'].match(/git checkout --quiet --detach "\$(1|ref)"\n\s+load_ssm_env$/gm) ?? []).length, 2, name);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssm-keys-'));
  fs.mkdirSync(path.join(dir, 'deploy'));
  const sharedFile = path.join(dir, 'shared.env');
  const EXAMPLE = [
    '# @desc Public data key @secret @used=backend @ssm=/sirloinbh/shared/data-go-kr-service-key',
    'HOLIDAY_API_KEY=',
    '# @desc Tiingo token @secret @used=backend @ssm=/sirloinbh/study-log/tiingo-api-key',
    'TIINGO_API_KEY=',
    '# @desc Not from SSM @secret @used=backend',
    'LOCAL_ONLY_KEY=',
    '# @desc A tag separated by a blank line does not apply @ssm=/sirloinbh/shared/stray',
    '',
    'STRAY_KEY=',
    '',
  ].join('\n');
  const KEYS = ['HOLIDAY_API_KEY', 'TIINGO_API_KEY', 'LOCAL_ONLY_KEY', 'STRAY_KEY', 'ANTHROPIC_API_KEY'];
  const run = (app, { env = SECRETS_ENV, shared = '', fake = 'printf "v:%s" "$1"', example = EXAMPLE } = {}) => {
    fs.writeFileSync(path.join(dir, '.env'), env);
    fs.writeFileSync(path.join(dir, '.env.example'), example);
    fs.writeFileSync(sharedFile, shared);
    fs.writeFileSync(path.join(dir, 'deploy/ssm-get.sh'), fake);
    const show = KEYS.map((k) => `printf "%s=%s\\n" ${k} "\${${k}:-unset}"`).join('; ');
    const r = spawnSync('bash', ['-c', `set -euo pipefail\n${loader(app)}\nload_ssm_env\nbash -c '${show}'`], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, ...Object.fromEntries(KEYS.map((k) => [k, ''])), STANDARDS_ENV_FILE: sharedFile.split(path.sep).join('/') },
    });
    return { ...r, values: Object.fromEntries(r.stdout.trim().split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2))) };
  };
  try {
    const ok = run('study-log');
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(ok.values, {
      HOLIDAY_API_KEY: 'v:/sirloinbh/shared/data-go-kr-service-key',
      TIINGO_API_KEY: 'v:/sirloinbh/study-log/tiingo-api-key',
      LOCAL_ONLY_KEY: 'unset',
      STRAY_KEY: 'unset',
      ANTHROPIC_API_KEY: 'v:/sirloinbh/shared/anthropic-api-key',
    });
    assert.equal(ok.stderr, '');
    const tagged = run('study-log', { example: '# @desc Claude @secret @ssm=/sirloinbh/study-log/anthropic-api-key\nANTHROPIC_API_KEY=\n' });
    assert.equal(tagged.values.ANTHROPIC_API_KEY, 'v:/sirloinbh/study-log/anthropic-api-key', 'a tag wins over the features.claude default');
    const noClaude = run('workout-memo');
    assert.equal(noClaude.values.ANTHROPIC_API_KEY, 'unset');
    assert.equal(noClaude.values.HOLIDAY_API_KEY, 'v:/sirloinbh/shared/data-go-kr-service-key');
    const failed = run('study-log', { fake: 'echo leaked-value; exit 1' });
    assert.equal(failed.status, 0, 'a failed SSM read must not stop the deploy');
    assert.equal(failed.values.HOLIDAY_API_KEY, 'unset');
    assert.match(failed.stderr, /could not read HOLIDAY_API_KEY from SSM \(\/sirloinbh\/shared\/data-go-kr-service-key\)/);
    assert.ok(!failed.stderr.includes('leaked-value'));
    const noPair = run('study-log', { env: 'HOLIDAY_API_KEY=from-env-file\n', fake: 'echo should-not-run; exit 9' });
    assert.equal(noPair.status, 0);
    assert.equal(noPair.values.HOLIDAY_API_KEY, 'unset', 'without the key pair compose keeps reading .env');
    const shared = run('study-log', { env: '', shared: SECRETS_ENV });
    assert.equal(shared.values.TIINGO_API_KEY, 'v:/sirloinbh/study-log/tiingo-api-key', 'the pair in the shared server file is enough');
    const noExample = run('workout-memo', { example: '' });
    assert.equal(noExample.status, 0, noExample.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
