// Runs the rendered backup.sh with fakes (shared by the deploy-backup*.test.mjs files). Not a test file itself.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rendered, project, has } from './deploy-helpers.mjs';

// Runs the rendered backup.sh with fake docker, curl and flock on PATH, in a temporary app folder.
export function backupRun(args, { env = '', shared = null, restored = 'public.a|2\npublic.b|5\n', setup, failCounts = false } = {}) {
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
  // The shared server file stands in for /opt/project-standards/.env; absent unless given.
  const sharedFile = path.join(dir, 'shared.env');
  if (shared !== null) fs.writeFileSync(sharedFile, shared);
  // A fake deploy/notify.sh records the healthchecks.io signals (#284).
  fs.mkdirSync(path.join(app, 'deploy'));
  fs.writeFileSync(path.join(app, 'deploy/notify.sh'), 'echo "$*" >> "$FAKE_LOG.notify"\n');
  setup?.({ app, store });
  const log = path.join(dir, 'log');
  // Git Bash on Windows takes a POSIX PATH; prepend the fake tools.
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; ${script.replace(/^#!.*\n/, '')}`, 'backup.sh', ...args], {
    encoding: 'utf8',
    env: { ...process.env, FAKE_LOG: posix(log), RESTORED: restored, FAIL_COUNTS: failCounts ? '1' : '', STANDARDS_ENV_FILE: posix(sharedFile) },
  });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const result = { status: r.status, stdout: r.stdout, stderr: r.stderr, files: fs.readdirSync(store).sort(), curlArgs: read('.curl-args'), curlStdin: read('.curl-stdin'), docker: read('.docker'), notify: read('.notify') };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}
export const S3_ENV = 'BACKUP_S3_BUCKET=sirloinbh-backups\nBACKUP_AWS_ACCESS_KEY_ID=fake-id\nBACKUP_AWS_SECRET_ACCESS_KEY=fake-secret-value\n';
export const canRunBackup = has('bash') && has('gzip');
