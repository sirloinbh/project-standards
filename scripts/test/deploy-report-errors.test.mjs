// Deploy script templates: error lines in the report and the ones saved before a deploy (#285, #644).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { rendered, has } from './deploy-helpers.mjs';
import { reportRun, errLine, handlerLine, infoLine } from './deploy-report-helpers.mjs';

// A shared-auth sign-in line (shared-auth#33): info for a success, warn for a refusal, never an error.
const signInLine = (outcome) => JSON.stringify({ time: '2026-11-18T01:00:00.000Z', level: outcome === 'success' ? 'info' : 'warn', event: 'sign_in', outcome, provider: 'github', ip: '203.0.113.7', userAgent: 'Mozilla/5.0' });

test('the report counts error log lines, lists request IDs without messages, and fails over REPORT_ERROR_LIMIT', { skip: !has('bash') && 'bash not found' }, () => {
  const none = reportRun([], { logs: infoLine + '\n' });
  assert.match(none.notify, /^ping\|report\|ok\|memory=45% disk=41% deployed=abc123def456 errors=0 containers:/);
  assert.doesNotMatch(none.notify, /\[/);

  const one = [handlerLine('req-1', 'connect ECONNREFUSED secret-host'), errLine('req-1', 500, '/api/workouts'), infoLine].join('\n') + '\n';
  const failing = reportRun([], { logs: one });
  assert.match(failing.notify, /^ping\|report\|fail\|.* errors=2 \[req-1 500 \/api\/workouts\] containers:/, 'any error fails with the default limit 0');
  assert.doesNotMatch(failing.notify, /ECONNREFUSED|secret-host/, 'the message never leaves the server');
  assert.match(reportRun(['line'], { logs: one }).stdout, / errors=2 \[req-1 500 \/api\/workouts\] containers:/);

  assert.match(reportRun([], { logs: one, env: 'REPORT_ERROR_LIMIT=2\n' }).notify, /^ping\|report\|ok\|.* errors=2 /, 'at the limit is ok');
  assert.match(reportRun([], { logs: one, env: 'REPORT_ERROR_LIMIT=1\n' }).notify, /^ping\|report\|fail\|/, 'over the limit fails');
  assert.match(reportRun([], { logs: one, env: 'REPORT_ERROR_LIMIT=abc\n' }).notify, /^ping\|report\|fail\|/, 'a bad limit falls back to 0');

  const many = Array.from({ length: 8 }, (_, i) => errLine('id' + i, 500, '/api/x' + i)).join('\n') + '\n';
  const capped = reportRun([], { logs: many, env: 'REPORT_ERROR_LIMIT=10\n' });
  assert.match(capped.notify, / errors=8 \[id0 500 \/api\/x0, id1 500 \/api\/x1, id2 500 \/api\/x2, id3 500 \/api\/x3, id4 500 \/api\/x4\] containers:/);
  assert.doesNotMatch(capped.notify, /id5/);
});

test('remote-deploy saves the api error lines before replacing the container and never fails without one', { skip: !has('bash') && 'bash not found' }, () => {
  const text = rendered['study-log']['deploy/remote-deploy.sh'];
  const fn = text.match(/^save_api_errors\(\) \{[\s\S]*?^\}$/m)[0];
  assert.equal((text.match(/^ {4}save_api_errors$/gm) ?? []).length, 1, 'the deploy path saves before up -d');
  assert.match(text, /load_ssm_env\n {2}save_api_errors\n {2}ensure_networks\n {2}IMAGE_TAG="\$1" docker compose up -d --wait db/, 'the start path (rollback) saves before up -d');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'save-errors-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const posix = (p) => p.split(path.sep).join('/');
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const logsFile = path.join(dir, 'logs.txt');
  fs.writeFileSync(logsFile, [infoLine, errLine('r1', 500, '/api/a'), signInLine('success')].join('\n') + '\n');
  const docker = (running, exit = 0) => fs.writeFileSync(path.join(bin, 'docker'), ['#!/bin/bash', 'case "$1 $2" in', `  "compose ps") ${running ? 'echo id1' : 'true'} ;;`, `  "compose logs") echo "$@" >> '${posix(path.join(dir, 'args.txt'))}'; cat '${posix(logsFile)}'; exit ${exit} ;;`, 'esac', ''].join('\n'), { mode: 0o755 });
  const run = () => spawnSync('bash', ['-c', `set -euo pipefail; export PATH="${pathVar}"; ${fn}\nsave_api_errors; echo done`], { cwd: dir, encoding: 'utf8' });
  const file = path.join(dir, '.errors-before-deploy.log');
  try {
    docker(false);
    const none = run();
    assert.equal(none.status, 0, none.stderr);
    assert.equal(fs.existsSync(file), false, 'no running container, nothing saved');
    docker(true);
    assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(file, 'utf8'), errLine('r1', 500, '/api/a') + '\n' + signInLine('success') + '\n', 'only error and sign-in lines are saved');
    assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length, 4, 'later deploys append');
    const args = path.join(dir, 'args.txt');
    assert.match(fs.readFileSync(args, 'utf8'), /--since 24h api/, 'without .report-last-sent the window is 24 hours');
    fs.writeFileSync(path.join(dir, '.report-last-sent'), '2026-11-17T19:00:00Z\n');
    assert.equal(run().status, 0);
    assert.match(fs.readFileSync(args, 'utf8'), /--since 2026-11-17T19:00:00Z api/, 'with it the window starts at the last report');
    fs.unlinkSync(path.join(dir, '.report-last-sent'));
    docker(true, 1);
    const failing = run();
    assert.equal(failing.status, 0, 'a docker failure does not fail the deploy');
    assert.match(failing.stdout, /done/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the report adds sign-in counts only when the api logs have sign-in lines, and never counts them as errors (#1089)', { skip: !has('bash') && 'bash not found' }, () => {
  assert.doesNotMatch(reportRun([], { logs: infoLine + '\n' }).notify, /signins=/, 'repos without sign-in lines keep their line');

  const day = [signInLine('success'), signInLine('refused_not_allowed'), signInLine('success'), signInLine('refused_second_user'), signInLine('refused_not_allowed'), infoLine].join('\n') + '\n';
  const counted = reportRun([], { logs: day });
  assert.match(counted.notify, /^ping\|report\|ok\|.* errors=0 signins=2 refused=3 containers:/);
  assert.doesNotMatch(counted.notify, /203\.0\.113\.7|Mozilla/, 'no IP or user agent leaves the server');

  const saved = reportRun(['line'], { logs: signInLine('success') + '\n', saved: signInLine('refused_not_allowed') + '\n' + errLine('r9', 500, '/api/auth/x') + '\n' });
  assert.match(saved.stdout, / errors=1 \[r9 500 \/api\/auth\/x\] signins=1 refused=1 containers:/, 'lines saved before a deploy count too');

  assert.match(reportRun([], { logs: signInLine('refused_not_allowed') + '\n' }).notify, /^ping\|report\|ok\|.* errors=0 signins=0 refused=1 /, 'refusals do not fail the day');
});
