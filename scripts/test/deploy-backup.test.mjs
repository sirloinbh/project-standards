// Deploy script templates: backup.sh dumps and S3 upload (#36, ADR-0009, ADR-0010).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { rendered } from './deploy-helpers.mjs';
import { backupRun, S3_ENV, canRunBackup } from './deploy-backup-helpers.mjs';

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

test('backup reads the S3 bucket and key pair from the shared server file first (ADR-0010)', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const shared = backupRun(['dump'], { shared: S3_ENV });
  assert.equal(shared.status, 0, shared.stderr);
  assert.equal(shared.curlArgs.trim().split('\n').length, 2);
  assert.equal(shared.curlStdin, 'user = "fake-id:fake-secret-value"\n'.repeat(2));
  // The shared file wins over a stale pair left in the app .env.
  const stale = backupRun(['dump'], { shared: S3_ENV, env: 'BACKUP_AWS_ACCESS_KEY_ID=old-id\nBACKUP_AWS_SECRET_ACCESS_KEY=old-secret\n' });
  assert.equal(stale.curlStdin, 'user = "fake-id:fake-secret-value"\n'.repeat(2));
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

test('a failed pg_dump leaves no .part file, and an old .part file is pruned (#874)', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const failed = backupRun(['dump'], { failDump: true });
  assert.notEqual(failed.status, 0, 'a failed dump fails the script');
  assert.deepEqual(failed.files, [], 'no .part or partial dump remains');
  // A .part file from a killed script (no exit handler ran) is deleted after a day; a fresh one is kept.
  const pruned = backupRun(['dump'], {
    setup: ({ store }) => {
      const old = path.join(store, 'study-2020-01-01-000000.sql.gz.part');
      const fresh = path.join(store, 'study-2999-01-01-000000.sql.gz.part');
      fs.writeFileSync(old, 'x');
      fs.writeFileSync(fresh, 'x');
      const past = new Date(Date.now() - 3 * 24 * 3600 * 1000);
      fs.utimesSync(old, past, past);
    },
  });
  assert.equal(pruned.status, 0, pruned.stderr);
  assert.ok(!pruned.files.includes('study-2020-01-01-000000.sql.gz.part'), 'old .part file is deleted');
  assert.ok(pruned.files.includes('study-2999-01-01-000000.sql.gz.part'), 'fresh .part file is kept');
});
