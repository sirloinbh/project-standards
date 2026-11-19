// Runs the rendered report.sh with fakes, and the log lines its tests feed it (shared by the deploy-report*.test.mjs files). Not a test file itself.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root, rendered, has } from './deploy-helpers.mjs';

// Runs the rendered report.sh with fake free, df and docker and a recording deploy/notify.sh (#285).
export function reportRun(args, { env = '', usedMb = 900, diskPercent = 41, failed = null, logs = '', saved = null, lastSent = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  for (const d of [bin, app, path.join(app, 'deploy')]) fs.mkdirSync(d, { recursive: true });
  const posix = (p) => p.split(path.sep).join('/');
  const tool = (name, lines) => fs.writeFileSync(path.join(bin, name), ['#!/bin/bash', ...lines, ''].join('\n'), { mode: 0o755 });
  // 2000 MB total; "available" is total minus the used amount the test asks for.
  tool('free', ['echo "               total        used        free      shared  buff/cache   available"', `echo "Mem:            2000         700         300          10        1000        ${2000 - usedMb}"`]);
  tool('df', ['echo "Filesystem     1024-blocks    Used Available Capacity Mounted on"', `echo "/dev/root         40000000 1600000  2400000      ${diskPercent}% /"`]);
  tool('docker', ['case "$1 $2" in', '  "compose ps") echo id1; echo id2 ;;', '  "compose logs") echo "$@" >> "$FAKE_LOG.args"; cat "$FAKE_LOG.logs" 2> /dev/null ;;', '  "stats --no-stream") echo "study-log-api-1 120.5MiB / 1.9GiB"; echo "study-log-db-1 45MiB / 1.9GiB" ;;', 'esac']);
  fs.writeFileSync(path.join(app, 'deploy/notify.sh'), 'printf "%s|" "$@" >> "$FAKE_LOG.notify"; echo >> "$FAKE_LOG.notify"\n');
  fs.writeFileSync(path.join(app, '.env'), env);
  fs.writeFileSync(path.join(app, '.deployed'), 'abc123def456');
  if (failed) fs.writeFileSync(path.join(app, '.autodeploy-failed'), failed);
  if (saved !== null) fs.writeFileSync(path.join(app, '.errors-before-deploy.log'), saved);
  if (lastSent !== null) fs.writeFileSync(path.join(app, '.report-last-sent'), lastSent);
  const script = rendered['study-log']['deploy/report.sh'].replace('cd /opt/study-log', `cd '${posix(app)}'`).replace(/^#!.*\n/, '');
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const log = path.join(dir, 'log');
  fs.writeFileSync(log + '.logs', logs);
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; ${script}`, 'report.sh', ...args], { encoding: 'utf8', env: { ...process.env, FAKE_LOG: posix(log) } });
  const notify = fs.existsSync(log + '.notify') ? fs.readFileSync(log + '.notify', 'utf8') : '';
  const savedFile = path.join(app, '.errors-before-deploy.log');
  const savedAfter = fs.existsSync(savedFile) ? fs.readFileSync(savedFile, 'utf8') : null;
  const sentFile = path.join(app, '.report-last-sent');
  const lastSentAfter = fs.existsSync(sentFile) ? fs.readFileSync(sentFile, 'utf8') : null;
  const logArgs = fs.existsSync(log + '.args') ? fs.readFileSync(log + '.args', 'utf8') : '';
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, notify, savedAfter, lastSentAfter, logArgs };
}

export const errLine = (id, status, path) => JSON.stringify({ time: '2026-11-18T01:00:00.000Z', level: 'error', requestId: id, method: 'GET', path, status, ms: 5 });
export const handlerLine = (id, message) => JSON.stringify({ time: '2026-11-18T01:00:00.000Z', level: 'error', event: 'request_error', requestId: id, message });
export const infoLine = JSON.stringify({ time: '2026-11-18T01:00:00.000Z', level: 'info', requestId: 'okid', method: 'GET', path: '/api/health', status: 200, ms: 1 });
