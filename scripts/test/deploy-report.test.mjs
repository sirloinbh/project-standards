// Deploy script templates: the daily report (#285, #644).
import assert from 'node:assert/strict';
import test from 'node:test';
import { rendered, has } from './deploy-helpers.mjs';
import { reportRun, errLine } from './deploy-report-helpers.mjs';

test('the daily report is one line with memory, disk, deployed commit and container memory', { skip: !has('bash') && 'bash not found' }, () => {
  const r = reportRun(['line']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'memory=45% disk=41% deployed=abc123def456 errors=0 containers: study-log-api-1 120.5MiB, study-log-db-1 45MiB\n');
  assert.equal(r.notify, '', 'line only prints');
  const failed = reportRun(['line'], { failed: 'fff000' });
  assert.match(failed.stdout, /deployed=abc123def456 autodeploy-failed=fff000 errors=0 containers:/);
});

test('the report sends ok, and fail over the memory or disk threshold', { skip: !has('bash') && 'bash not found' }, () => {
  const ok = reportRun([]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.notify, 'ping|report|ok|memory=45% disk=41% deployed=abc123def456 errors=0 containers: study-log-api-1 120.5MiB, study-log-db-1 45MiB|\n');
  assert.match(reportRun([], { usedMb: 1800 }).notify, /^ping\|report\|fail\|memory=90%/);
  assert.match(reportRun([], { diskPercent: 95 }).notify, /^ping\|report\|fail\|/);
  assert.match(reportRun([], { usedMb: 1800, env: 'REPORT_MEMORY_PERCENT=95\n' }).notify, /^ping\|report\|ok\|/, 'the threshold comes from .env');
  for (const [name, files] of Object.entries(rendered)) {
    assert.match(files['deploy/report.timer'], /^OnCalendar=\*-\*-\* 04:00:00 Asia\/Seoul$/m, name);
    assert.match(files['deploy/install-backup.sh'], /^units="backup restore-check health report"$/m, name);
  }
});

test('the report counts the errors saved before a deploy and empties the file', { skip: !has('bash') && 'bash not found' }, () => {
  const saved = errLine('old-1', 502, '/api/old') + '\n';
  const r = reportRun([], { saved, logs: errLine('new-1', 500, '/api/new') + '\n' });
  assert.match(r.notify, /^ping\|report\|fail\|.* errors=2 \[old-1 502 \/api\/old, new-1 500 \/api\/new\] containers:/);
  assert.equal(r.savedAfter, '', 'the saved lines are counted once');
  const lineOnly = reportRun(['line'], { saved });
  assert.match(lineOnly.stdout, / errors=1 /);
  assert.equal(lineOnly.savedAfter, saved, 'line does not empty the file');
  assert.equal(reportRun([]).savedAfter, null, 'no file is created when there is none');
});

test('the report records its send time and the next window starts there, so a saved line is not counted twice (#644)', { skip: !has('bash') && 'bash not found' }, () => {
  const first = reportRun([]);
  assert.match(first.logArgs, /--since 24h --until \S+ api/, 'first run without the file uses 24 hours');
  assert.match(first.lastSentAfter ?? '', /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\n$/, 'the send time is recorded');
  const stamp = '2026-11-17T19:00:00Z';
  const next = reportRun([], { lastSent: stamp + '\n' });
  assert.match(next.logArgs, /--since 2026-11-17T19:00:00Z --until \S+ api/, 'the window starts at the last send');
  assert.notEqual(next.lastSentAfter, stamp + '\n', 'the time moves forward after a send');
  assert.match(reportRun([], { lastSent: 'garbage' }).logArgs, /--since 24h --until \S+ api/, 'a bad file falls back to 24 hours');
  const lineOnly = reportRun(['line'], { lastSent: stamp + '\n' });
  assert.match(lineOnly.logArgs, /--since 2026-11-17T19:00:00Z --until \S+ api/, 'line uses the same window');
  assert.equal(lineOnly.lastSentAfter, stamp + '\n', 'line does not record a send');
});

test('report keeps the saved error lines and the window start when the ping fails (#1030)', { skip: !has('bash') && 'bash not found' }, () => {
  const saved = errLine('old', 500, '/api/old') + '\n';
  const failed = reportRun([], { saved, lastSent: '2026-11-17T00:00:00Z', notifyExit: 1 });
  assert.equal(failed.savedAfter, saved);
  assert.equal(failed.lastSentAfter, '2026-11-17T00:00:00Z');
  const sent = reportRun([], { saved, lastSent: '2026-11-17T00:00:00Z' });
  assert.equal(sent.savedAfter, '');
  assert.notEqual(sent.lastSentAfter, '2026-11-17T00:00:00Z');
});
