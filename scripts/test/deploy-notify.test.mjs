// Deploy script templates: notify.sh signals and health pings (#284).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { data, rendered, project, has } from './deploy-helpers.mjs';

// Runs the rendered notify.sh with a fake curl (#284). HEALTH_OK=0 makes the health endpoint fail.
function notifyRun(args, { env = '', healthOk = true, pingOk = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notify-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  for (const d of [bin, app]) fs.mkdirSync(d);
  const posix = (p) => p.split(path.sep).join('/');
  fs.writeFileSync(
    path.join(bin, 'curl'),
    ['#!/bin/bash', 'echo "$*" >> "$FAKE_LOG.curl-args"', 'if [[ "$*" == */api/health* ]]; then [ "$HEALTH_OK" = 1 ]; exit $?; fi', 'cat >> "$FAKE_LOG.curl-stdin"', '[ "$PING_OK" = 1 ]', ''].join('\n'),
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(app, '.env'), env);
  const script = rendered['study-log']['deploy/notify.sh'].replace('cd /opt/study-log', `cd '${posix(app)}'`).replace(/^#!.*\n/, '');
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const log = path.join(dir, 'log');
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; ${script}`, 'notify.sh', ...args], { encoding: 'utf8', env: { ...process.env, FAKE_LOG: posix(log), HEALTH_OK: healthOk ? '1' : '0', PING_OK: pingOk ? '1' : '0' } });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const result = { status: r.status, stdout: r.stdout, stderr: r.stderr, curlArgs: read('.curl-args'), curlStdin: read('.curl-stdin') };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}
const HC = 'https://hc-ping.com/00000000-0000-0000-0000-00000000abcd';

test('notify sends ok and fail signals with the message as the body, and never prints the URL', { skip: !has('bash') && 'bash not found' }, () => {
  const none = notifyRun(['ping', 'backup', 'ok', 'x']);
  assert.equal(none.status, 0);
  assert.equal(none.curlArgs, '', 'no URL in .env, no signal');

  const ok = notifyRun(['ping', 'backup', 'ok', 'study-2026.sql.gz 4.0K'], { env: `HEALTHCHECK_URL_BACKUP="${HC}"\n` });
  assert.equal(ok.status, 0);
  assert.match(ok.curlArgs, new RegExp(`--data-binary @- ${HC}$`, 'm'));
  assert.equal(ok.curlStdin, 'study-2026.sql.gz 4.0K');
  // Compare with the UUID, not the URL (CodeQL reads a URL substring check as URL validation).
  assert.doesNotMatch(ok.stdout + ok.stderr, /00000000abcd/, 'the URL is not printed');

  const fail = notifyRun(['ping', 'deploy', 'fail', 'CI failed'], { env: `HEALTHCHECK_URL_DEPLOY=${HC}\r\n` });
  assert.match(fail.curlArgs, new RegExp(`${HC}/fail$`, 'm'));

  assert.equal(notifyRun(['ping', 'other', 'ok']).status, 2);
  assert.equal(notifyRun(['ping', 'backup', 'maybe']).status, 2);
});

test('notify health pings ok or fail from /api/health on the web port', { skip: !has('bash') && 'bash not found' }, () => {
  const env = `WEB_PORT=8102\nHEALTHCHECK_URL_HEALTH=${HC}\n`;
  const up = notifyRun(['health'], { env });
  assert.equal(up.status, 0);
  assert.match(up.curlArgs, /http:\/\/127\.0\.0\.1:8102\/api\/health/);
  assert.match(up.curlArgs, new RegExp(`--data-binary @- ${HC}$`, 'm'));
  const down = notifyRun(['health'], { env, healthOk: false });
  assert.equal(down.status, 1);
  assert.match(down.curlArgs, new RegExp(`${HC}/fail$`, 'm'));
  const registryPort = notifyRun(['health'], { env: `HEALTHCHECK_URL_HEALTH=${HC}\n` });
  assert.match(registryPort.curlArgs, new RegExp(`127\\.0\\.0\\.1:${project('study-log').ports.web}/api/health`));
});

test('a failed ping makes notify ping exit 1, but never changes the health result (#1030)', { skip: !has('bash') && 'bash not found' }, () => {
  const env = `WEB_PORT=8102
HEALTHCHECK_URL_HEALTH=${HC}
HEALTHCHECK_URL_REPORT=${HC}
`;
  const sent = notifyRun(['ping', 'report', 'ok', 'x'], { env, pingOk: false });
  assert.equal(sent.status, 1);
  assert.match(sent.stderr, /could not send the report signal/);
  assert.equal(notifyRun(['ping', 'report', 'ok', 'x'], { env }).status, 0);
  assert.equal(notifyRun(['ping', 'report', 'ok', 'x'], { pingOk: false }).status, 0, 'no URL, nothing to send');
  assert.equal(notifyRun(['health'], { env, pingOk: false }).status, 0, 'health is up; only the ping failed');
  assert.equal(notifyRun(['health'], { env, healthOk: false, pingOk: false }).status, 1);
});
