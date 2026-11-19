// Deploy script templates: backup restore check, timers, and notify signals (#36, ADR-0009, #284).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { rendered, project } from './deploy-helpers.mjs';
import { backupRun, canRunBackup } from './deploy-backup-helpers.mjs';

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
  // Over TCP, so the first-run temporary server (no TCP listener) is not taken as ready (#392).
  assert.match(ok.docker, /exec study-restore-check pg_isready -q -h 127\.0\.0\.1 /);
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


test('backup signals the nightly dump and the restore check, not pre-deploy dumps', { skip: !canRunBackup && 'bash or gzip not found' }, () => {
  const nightly = backupRun(['dump']);
  assert.equal(nightly.status, 0, nightly.stderr);
  assert.match(nightly.notify, /^ping backup ok study-\d{4}-\d\d-\d\d-\d{6}\.sql\.gz \S+\n$/);
  assert.equal(backupRun(['dump', 'predeploy']).notify, '');
  const s3Failed = backupRun(['dump'], { env: 'BACKUP_S3_BUCKET=sirloinbh-backups\n' });
  assert.equal(s3Failed.status, 3);
  assert.match(s3Failed.notify, /^ping backup fail exit 3: study-/);

  const seed = ({ store }) => {
    fs.writeFileSync(path.join(store, 'study-2026-10-26-033000.sql.gz'), spawnSync('gzip', ['-c'], { input: '-- dump\n' }).stdout);
    fs.writeFileSync(path.join(store, 'study-2026-10-26-033000.counts'), 'public.a|2\npublic.b|5\n');
  };
  assert.match(backupRun(['verify'], { setup: seed }).notify, /^ping restore ok study-2026-10-26-033000\.sql\.gz, 2 tables\n$/);
  const bad = backupRun(['verify'], { setup: seed, restored: 'public.a|2\n' });
  assert.match(bad.notify, /^ping restore fail exit 1: /);
  assert.match(bad.docker, /rm -f study-restore-check/, 'the throwaway database is still removed');
});
