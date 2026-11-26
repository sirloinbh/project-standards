// AWS alert path (#1091): signals.sh (record, evaluate, call), the notify.sh sink switch and the public-check.sh aws sink,
// all with a fake curl. No AWS CLI is involved: SigV4 is built into curl, like the S3 upload in backup.sh.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderProxy } from '../lib/proxy.mjs';
import { loadAll } from '../lib/registry.mjs';
import { has, rendered } from './deploy-helpers.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const { data } = loadAll(root);
const files = new Map(renderProxy(data, { domain: 'example.com' }).map((f) => [f.path, f.content]));
const skip = !has('bash') && 'bash not found';
const posix = (p) => p.split(path.sep).join('/');
const msys = (p) => (process.platform === 'win32' ? posix(p).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : p);
const KEY_ID = 'AKIAEXAMPLEALERT0001'; // secret-scan:allow
const KEY_SECRET = 'alertSecretExampleValue0000000000000000x'; // secret-scan:allow
const TOPIC = 'arn:aws:sns:ap-northeast-2:111122223333:uptime';
const AWS_ENV = `AWS_ALERT_ACCESS_KEY_ID=${KEY_ID}\nAWS_ALERT_SECRET_ACCESS_KEY=${KEY_SECRET}\nAWS_ALERT_TOPIC_ARN=${TOPIC}\n`;
const HC = 'https://hc-ping.com/00000000-0000-0000-0000-00000000cafe';

// A sandbox: fake curl (logs args and stdin; fails for URLs in FAIL_URLS), state dir, shared env.
function sandbox(sharedEnv = AWS_ENV, appEnv = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signals-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  for (const d of [bin, app, path.join(dir, 'state')]) fs.mkdirSync(d);
  const log = posix(path.join(dir, 'log'));
  fs.writeFileSync(
    path.join(bin, 'curl'),
    ['#!/bin/bash', 'echo "$*" >> "$FAKE_LOG.args"', 'cat >> "$FAKE_LOG.stdin"', 'for u in $FAIL_URLS; do if [[ "$*" == *"$u"* ]]; then exit 22; fi; done', 'exit 0', ''].join('\n'),
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(dir, 'shared.env'), sharedEnv);
  fs.writeFileSync(path.join(app, '.env'), appEnv);
  const signals = path.join(dir, 'signals.sh');
  fs.writeFileSync(signals, files.get('signals.sh'), { mode: 0o644 }); // not executable, like the proxy files on the server: callers use bash
  const run = (script, args, { now = 1000000, failUrls = [], extraEnv = {}, prelude = '' } = {}) => {
    const r = spawnSync('bash', ['-c', `export PATH="${msys(bin)}:$PATH"; ${prelude} bash "${posix(script)}" ${args.map((a) => `'${a}'`).join(' ')}`], {
      encoding: 'utf8',
      cwd: app,
      env: { ...process.env, FAKE_LOG: log, FAIL_URLS: failUrls.join(' '), STANDARDS_ENV_FILE: posix(path.join(dir, 'shared.env')), SIGNALS_STATE_DIR: posix(path.join(dir, 'state')), SIGNALS_NOW: String(now), SIGNALS_SH: posix(signals), ...extraEnv },
    });
    return { status: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr };
  };
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  return { dir, signals, run, args: () => read('.args'), stdin: () => read('.stdin'), published: () => (fs.existsSync(path.join(dir, 'state/.published')) ? fs.readFileSync(path.join(dir, 'state/.published'), 'utf8').trim() : null), clear: () => { for (const s of ['.args', '.stdin']) fs.rmSync(log + s, { force: true }); }, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const aws = (box, args, opts) => box.run(box.signals, args, opts);

test('signals.sh is generated from the registry paths and is valid bash', { skip }, () => {
  const text = files.get('signals.sh');
  assert.match(text, /\/opt\/project-standards\/\.env/);
  assert.doesNotMatch(text, /__SHARED_ENV__|undefined|\{\{/);
  assert.equal(spawnSync('bash', ['-n'], { input: text, encoding: 'utf8' }).status, 0);
});

test('evaluate sends HeartbeatOk and FailingSignals to CloudWatch, signed, with the key on stdin only', { skip }, () => {
  const box = sandbox();
  try {
    aws(box, ['record', 'workout-memo', 'health', 'ok']);
    aws(box, ['record', 'workout-memo', 'backup', 'ok']);
    const r = aws(box, ['evaluate']);
    assert.equal(r.status, 0, r.err);
    const args = box.args();
    assert.match(args, /--aws-sigv4 aws:amz:ap-northeast-2:monitoring/);
    assert.match(args, /https:\/\/monitoring\.ap-northeast-2\.amazonaws\.com\//);
    assert.match(args, /--data-urlencode Action=PutMetricData/);
    assert.match(args, /--data-urlencode Namespace=ProjectStandards\/Uptime/);
    assert.match(args, /MetricData\.member\.1\.MetricName=HeartbeatOk --data-urlencode MetricData\.member\.1\.Value=1/);
    assert.match(args, /MetricData\.member\.2\.MetricName=FailingSignals --data-urlencode MetricData\.member\.2\.Value=0/);
    assert.ok(box.stdin().includes(`user = "${KEY_ID}:${KEY_SECRET}"`), 'the key pair goes to curl on stdin');
    assert.ok(!args.includes(KEY_SECRET) && !args.includes(KEY_ID), 'no key in the arguments');
    assert.ok(!r.all.includes(KEY_SECRET), 'no key in the output');
    assert.equal(box.published(), 'none', 'nothing failing: state saved without an SNS message');
    assert.doesNotMatch(args, /sns\./);
  } finally {
    box.done();
  }
});

test('a state change publishes to SNS once, with signal names only, and recovery publishes once', { skip }, () => {
  const box = sandbox();
  try {
    aws(box, ['record', 'workout-memo', 'health', 'fail']);
    aws(box, ['record', 'study-log', 'backup', 'ok']);
    const first = aws(box, ['evaluate']);
    assert.equal(first.status, 0, first.err);
    assert.match(box.args(), /--aws-sigv4 aws:amz:ap-northeast-2:sns/);
    assert.match(box.args(), /--data-urlencode Action=Publish/);
    assert.match(box.args(), new RegExp(`TopicArn=${TOPIC}`));
    assert.match(box.args(), /Message=Failing signals: workout-memo\.health\./);
    assert.match(box.args(), /MetricData\.member\.2\.Value=1/);
    assert.equal(box.published(), 'workout-memo.health');
    box.clear();
    aws(box, ['evaluate']);
    assert.doesNotMatch(box.args(), /Action=Publish/, 'the same failing set does not publish again');
    assert.match(box.args(), /Action=PutMetricData/, 'the heartbeat still goes out');
    box.clear();
    aws(box, ['record', 'workout-memo', 'health', 'ok']);
    aws(box, ['evaluate']);
    assert.match(box.args(), /Subject=Uptime recovered/);
    assert.equal(box.published(), 'none');
    box.clear();
    aws(box, ['evaluate']);
    assert.doesNotMatch(box.args(), /Action=Publish/);
  } finally {
    box.done();
  }
});

test('a signal with no record within its limit is stale and counts as failing; a failed publish is retried', { skip }, () => {
  const box = sandbox();
  try {
    aws(box, ['record', 'workout-memo', 'health', 'ok'], { now: 1000 });
    aws(box, ['record', 'workout-memo', 'backup', 'ok'], { now: 1000 });
    // 20 minutes later: health (limit 15 minutes) is stale, backup (26 hours) is not.
    const r = aws(box, ['evaluate'], { now: 1000 + 1200, failUrls: ['sns.'] });
    assert.equal(r.status, 1, 'a failed publish fails the run');
    assert.match(box.args(), /Message=Failing signals: workout-memo\.health \(stale\)\./);
    assert.doesNotMatch(box.args(), /workout-memo\.backup/);
    assert.equal(box.published(), null, 'the state moves only after a successful publish');
    box.clear();
    const again = aws(box, ['evaluate'], { now: 1000 + 1260 });
    assert.equal(again.status, 0, again.err);
    assert.match(box.args(), /Action=Publish/);
    assert.equal(box.published(), 'workout-memo.health (stale)');
  } finally {
    box.done();
  }
});

test('without the alert key pair evaluate says so and sends nothing; call and bad input behave', { skip }, () => {
  const box = sandbox('');
  try {
    aws(box, ['record', 'a', 'health', 'fail']);
    const r = aws(box, ['evaluate']);
    assert.equal(r.status, 1);
    assert.match(r.err, /AWS alerts are not configured/);
    assert.equal(box.args(), '');
    assert.equal(aws(box, ['record', 'Bad Name', 'health', 'ok']).status, 2);
    assert.equal(aws(box, ['record', 'a', 'health', 'maybe']).status, 2);
    assert.equal(aws(box, ['bogus']).status, 2);
  } finally {
    box.done();
  }
  const withKey = sandbox();
  try {
    const r = aws(withKey, ['call', 'ses', 'Action=SendEmail', 'Version=2010-12-01']);
    assert.equal(r.status, 0, r.err);
    assert.match(withKey.args(), /--aws-sigv4 aws:amz:ap-northeast-2:ses/);
    assert.match(withKey.args(), /https:\/\/email\.ap-northeast-2\.amazonaws\.com\//);
    assert.match(aws(withKey, ['status']).out, /failing: $/m);
  } finally {
    withKey.done();
  }
});

// notify.sh of one app, sharing the sandbox: NOTIFY_SINK from the app .env or the shared file.
function notify(box, args, { appEnv = '', sharedEnv = AWS_ENV, failUrls = [] } = {}) {
  fs.writeFileSync(path.join(box.dir, 'app/.env'), appEnv);
  fs.writeFileSync(path.join(box.dir, 'shared.env'), sharedEnv);
  const script = rendered['study-log']['deploy/notify.sh'].replace('cd /opt/study-log', `cd '${posix(path.join(box.dir, 'app'))}'`);
  const file = path.join(box.dir, 'notify.sh');
  fs.writeFileSync(file, script);
  return box.run(file, args, { failUrls });
}

test('notify.sh: the default sink is healthchecks and never touches signals.sh', { skip }, () => {
  const box = sandbox();
  try {
    const r = notify(box, ['ping', 'backup', 'ok', 'dump'], { appEnv: `HEALTHCHECK_URL_BACKUP=${HC}\n` });
    assert.equal(r.status, 0, r.err);
    assert.match(box.args(), new RegExp(`--data-binary @- ${HC}$`, 'm'));
    assert.equal(fs.readdirSync(path.join(box.dir, 'state')).length, 0, 'no state recorded');
  } finally {
    box.done();
  }
});

test('notify.sh: NOTIFY_SINK=aws records the state and sends no ping; the shared file works when the app .env has none', { skip }, () => {
  const box = sandbox();
  try {
    const r = notify(box, ['ping', 'backup', 'fail', 'dump failed: secret-looking text'], { appEnv: `HEALTHCHECK_URL_BACKUP=${HC}\nNOTIFY_SINK=aws\n` });
    assert.equal(r.status, 0, r.err);
    assert.equal(box.args(), '', 'no ping, no AWS call from notify.sh itself');
    assert.match(fs.readFileSync(path.join(box.dir, 'state/study-log.backup'), 'utf8'), /^fail \d+\n$/);
    const shared = notify(box, ['ping', 'restore', 'ok'], { sharedEnv: `${AWS_ENV}NOTIFY_SINK=aws\n` });
    assert.equal(shared.status, 0, shared.err);
    assert.match(fs.readFileSync(path.join(box.dir, 'state/study-log.restore'), 'utf8'), /^ok \d+\n$/);
    assert.ok(!fs.readFileSync(path.join(box.dir, 'state/study-log.backup'), 'utf8').includes('secret-looking'), 'the message is not stored');
  } finally {
    box.done();
  }
});

test('notify.sh: NOTIFY_SINK=both runs both sinks, and one failing sink does not stop the other', { skip }, () => {
  const box = sandbox();
  try {
    const env = `HEALTHCHECK_URL_BACKUP=${HC}\nNOTIFY_SINK=both\n`;
    const ok = notify(box, ['ping', 'backup', 'ok', 'dump'], { appEnv: env });
    assert.equal(ok.status, 0, ok.err);
    assert.match(box.args(), new RegExp(`--data-binary @- ${HC}$`, 'm'));
    assert.ok(fs.existsSync(path.join(box.dir, 'state/study-log.backup')));
    // healthchecks fails: the state is still recorded, and the exit code tells the caller.
    fs.rmSync(path.join(box.dir, 'state/study-log.backup'));
    const hcDown = notify(box, ['ping', 'backup', 'ok', 'dump'], { appEnv: env, failUrls: ['hc-ping.com'] });
    assert.equal(hcDown.status, 1);
    assert.ok(fs.existsSync(path.join(box.dir, 'state/study-log.backup')), 'the aws sink ran although the ping failed');
    // the aws sink fails (no signals.sh): the ping is still sent.
    box.clear();
    const file = path.join(box.dir, 'notify.sh');
    const awsDown = box.run(file, ['ping', 'backup', 'ok', 'dump'], { extraEnv: { SIGNALS_SH: posix(path.join(box.dir, 'missing-signals.sh')) } });
    assert.equal(awsDown.status, 1);
    assert.match(box.args(), new RegExp(`--data-binary @- ${HC}$`, 'm'), 'the ping was sent although the aws sink failed');
  } finally {
    box.done();
  }
});

test('notify.sh: an unknown sink warns and falls back to healthchecks', { skip }, () => {
  const box = sandbox();
  try {
    const r = notify(box, ['ping', 'backup', 'ok'], { appEnv: `HEALTHCHECK_URL_BACKUP=${HC}\nNOTIFY_SINK=pigeon\n` });
    assert.equal(r.status, 0, r.err);
    assert.match(r.err, /unknown NOTIFY_SINK: pigeon; using healthchecks/);
    assert.match(box.args(), new RegExp(HC));
  } finally {
    box.done();
  }
});

test('public-check.sh: NOTIFY_SINK=aws records the server public signal and runs evaluate; both also pings', { skip }, () => {
  const box = sandbox();
  try {
    const script = files.get('public-check.sh');
    const file = path.join(box.dir, 'public-check.sh');
    fs.writeFileSync(file, script);
    fs.writeFileSync(path.join(box.dir, 'shared.env'), `${AWS_ENV}HEALTHCHECK_URL_PUBLIC=${HC}\nNOTIFY_SINK=aws\n`);
    const r = box.run(file, ['quick'], { failUrls: [] });
    assert.equal(r.status, 0, r.err);
    assert.match(fs.readFileSync(path.join(box.dir, 'state/server.public'), 'utf8'), /^ok \d+\n$/);
    assert.match(box.args(), /Action=PutMetricData/, 'the 5-minute run is the heartbeat');
    assert.doesNotMatch(box.args(), /--data-binary @- /, 'no healthchecks ping with the aws sink');
    box.clear();
    fs.writeFileSync(path.join(box.dir, 'shared.env'), `${AWS_ENV}HEALTHCHECK_URL_PUBLIC=${HC}\nNOTIFY_SINK=both\n`);
    const both = box.run(file, ['quick'], {});
    assert.equal(both.status, 0, both.err);
    assert.match(box.args(), /--data-binary @- /);
    assert.match(box.args(), /Action=PutMetricData/);
  } finally {
    box.done();
  }
});

test('record makes a new state directory world-writable with the sticky bit, so unprivileged app timers can write (#1121)', { skip: skip || process.platform === 'win32' }, () => {
  const box = sandbox();
  try {
    const fresh = path.join(box.dir, 'fresh', 'signals');
    const r = aws(box, ['record', 'study-log', 'deploy', 'ok'], { extraEnv: { SIGNALS_STATE_DIR: posix(fresh) } });
    assert.equal(r.status, 0, r.err);
    assert.equal((fs.statSync(fresh).mode & 0o7777).toString(8), '1777');
    assert.ok(fs.existsSync(path.join(fresh, 'study-log.deploy')));
  } finally {
    box.done();
  }
});
