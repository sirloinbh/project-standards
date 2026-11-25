// Public URL probe (#1076): the generated public-check.sh with a fake curl, dig and openssl.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderProxy } from '../lib/proxy.mjs';
import { loadAll } from '../lib/registry.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const { data } = loadAll(root);
const domain = 'example.com';
const files = new Map(renderProxy(data, { domain }).map((f) => [f.path, f.content]));
const script = files.get('public-check.sh');
const hasBash = spawnSync('bash', ['--version']).status === 0;
const posix = (p) => p.split(path.sep).join('/');
const hosts = [...script.matchAll(/'([a-z0-9-]+\.example\.com)'/g)].map((m) => m[1]);
const UUID = '00000000-0000-0000-0000-00000000beef';
const HC = `https://hc-ping.com/${UUID}`;
const SERVER_IP = '203.0.113.7';
const TOKEN = 'github_pat_faketoken0123';
const AWS_ENV = 'SECRETS_AWS_ACCESS_KEY_ID=AKIAFAKE\nSECRETS_AWS_SECRET_ACCESS_KEY=fakesecret\n';

// failHosts: hosts whose /api/health fails. dnsWrong: hosts whose DNS answer is another address. certOk: false = expiring.
function run(args, { env = '', failHosts = [], dnsWrong = [], certOk = true, pingOk = true, noDig = false, stateDir = '', now = '1000000', ssmOk = true, ghOk = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-check-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const log = posix(path.join(dir, 'log'));
  const fake = (name, lines) => fs.writeFileSync(path.join(bin, name), ['#!/bin/bash', ...lines, ''].join('\n'), { mode: 0o755 });
  fake('curl', [
    'echo "$*" >> "$FAKE_LOG.curl-args"',
    'if [[ "$*" == *" -K - "* ]]; then cat >> "$FAKE_LOG.curl-conf"; fi',
    'if [[ "$*" == *ssm.*amazonaws.com* ]]; then [ "$SSM_OK" = 1 ] || exit 22; echo \'{"Parameter":{"Value":"' + TOKEN + '"}}\'; exit 0; fi',
    'if [[ "$*" == *api.github.com* ]]; then [ "$GH_OK" = 1 ] || exit 22; if [[ "$*" == *"-X POST"*"/issues" ]]; then echo \'{"id": 1, "number": 42}\'; else echo \'{}\'; fi; exit 0; fi',
    'if [[ "$*" == *--data-binary* ]]; then cat >> "$FAKE_LOG.curl-stdin"; [ "$PING_OK" = 1 ]; exit $?; fi',
    'if [[ "$*" == *checkip.amazonaws.com* ]]; then echo "' + SERVER_IP + '"; exit 0; fi',
    'for h in $FAIL_HOSTS; do if [[ "$*" == *"--resolve $h:443:127.0.0.1"* ]]; then exit 22; fi; done',
    'exit 0',
  ]);
  if (!noDig) {
    fake('dig', [
      'echo "$*" >> "$FAKE_LOG.dig-args"',
      'for h in $DNS_WRONG; do if [[ "$*" == *" $h "* ]]; then echo 198.51.100.9; exit 0; fi; done',
      'echo "' + SERVER_IP + '"',
    ]);
  }
  // openssl is called twice in a pipe: s_client prints a marker, x509 -checkend succeeds only when CERT_OK=1.
  fake('openssl', ['if [ "$1" = s_client ]; then echo cert; exit 0; fi', 'cat > /dev/null', '[ "$CERT_OK" = 1 ]']);
  const envFile = path.join(dir, 'shared.env');
  fs.writeFileSync(envFile, env);
  const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
  const scriptFile = path.join(dir, 'public-check.sh');
  fs.writeFileSync(scriptFile, script);
  const r = spawnSync('bash', ['-c', `export PATH="${pathVar}"; bash "${posix(scriptFile)}" ${args.join(' ')}`], {
    encoding: 'utf8',
    env: { ...process.env, STANDARDS_ENV_FILE: posix(envFile), FAKE_LOG: log, FAIL_HOSTS: failHosts.join(' '), DNS_WRONG: dnsWrong.join(' '), CERT_OK: certOk ? '1' : '0', PING_OK: pingOk ? '1' : '0', SSM_OK: ssmOk ? '1' : '0', GH_OK: ghOk ? '1' : '0', PUBLIC_CHECK_STATE_DIR: posix(stateDir || path.join(dir, 'state')), PUBLIC_CHECK_NOW: now },
  });
  const read = (suffix) => (fs.existsSync(log + suffix) ? fs.readFileSync(log + suffix, 'utf8') : '');
  const result = { status: r.status, stdout: r.stdout, stderr: r.stderr, curlArgs: read('.curl-args'), curlStdin: read('.curl-stdin'), curlConf: read('.curl-conf'), digArgs: read('.dig-args') };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}
const skip = !hasBash && 'bash not found';

test('the probe covers every active app and shared service from the registry, and the files are written for the server', () => {
  const expected = [...data.projects.projects.filter((p) => p.status === 'active').map((p) => `${p.service.subdomain}.${domain}`), ...data.projects.sharedServices.map((s) => `${s.subdomain}.${domain}`)];
  assert.ok(expected.length >= 10);
  assert.deepEqual([...hosts].sort(), [...expected].sort());
  assert.match(files.get('public-check.service'), /ExecStart=\/bin\/bash \/opt\/project-standards\/proxy\/public-check\.sh/);
  assert.match(files.get('public-check.timer'), /OnCalendar=\*:0\/5/);
  assert.match(script, /\/opt\/project-standards\/\.env/);
  for (const name of ['public-check.sh', 'public-check.service', 'public-check.timer']) assert.doesNotMatch(files.get(name), /undefined|\{\{/, name);
});

test('public-check.sh is valid bash', { skip }, () => {
  assert.equal(spawnSync('bash', ['-n'], { input: script, encoding: 'utf8' }).status, 0);
});

test('all hosts ok: probes each through nginx with --resolve and pings ok with a count', { skip }, () => {
  const r = run(['quick'], { env: `HEALTHCHECK_URL_PUBLIC="${HC}"\n` });
  assert.equal(r.status, 0, r.stderr);
  for (const h of hosts) assert.ok(r.curlArgs.includes(`--resolve ${h}:443:127.0.0.1 https://${h}/api/health`), h);
  assert.match(r.curlArgs, new RegExp(`--data-binary @- ${HC}$`, 'm'));
  assert.equal(r.curlStdin, `public ok: ${hosts.length} hosts (quick)`);
  assert.equal(r.digArgs, '', 'quick mode makes no DNS lookup');
  assert.doesNotMatch(r.stdout + r.stderr, new RegExp(UUID), 'the ping URL is not printed');
});

test('one failing host: exit 1, a fail ping whose body names only that host', { skip }, () => {
  const bad = hosts[1];
  const r = run(['quick'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\r\n`, failHosts: [bad] });
  assert.equal(r.status, 1);
  assert.match(r.curlArgs, new RegExp(`${HC}/fail$`, 'm'));
  assert.match(r.curlStdin, new RegExp(`^public fail \\(quick\\): ${bad.replace(/\./g, '\\.')}: `));
  for (const h of hosts.filter((x) => x !== bad)) assert.ok(!r.curlStdin.includes(h), `${h} is not reported`);
  assert.doesNotMatch(r.curlStdin, new RegExp(UUID));
});

test('full mode: a DNS record that does not return the server address fails that host', { skip }, () => {
  const bad = hosts[0];
  const r = run(['full'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\nPUBLIC_CHECK_SERVER_IP=${SERVER_IP}\n`, dnsWrong: [bad] });
  assert.equal(r.status, 1);
  assert.match(r.curlStdin, new RegExp(`${bad.replace(/\./g, '\\.')}: DNS from 1\\.1\\.1\\.1 does not return the server address`));
  assert.match(r.digArgs, new RegExp(`\\+short .* A ${bad.replace(/\./g, '\\.')} @1\\.1\\.1\\.1`));
});

test('full mode: a certificate with fewer than 14 days left fails every host', { skip }, () => {
  const r = run(['full'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\nPUBLIC_CHECK_SERVER_IP=${SERVER_IP}\n`, certOk: false });
  assert.equal(r.status, 1);
  for (const h of hosts) assert.ok(r.curlStdin.includes(`${h}: certificate is missing or has fewer than 14 days left`), h);
});

test('full mode passes when DNS and the certificate are fine, and reads the server address when .env has none', { skip }, () => {
  const r = run(['full'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\n` });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.curlArgs, /checkip\.amazonaws\.com/);
  assert.equal(r.curlStdin, `public ok: ${hosts.length} hosts (full)`);
});

test('without dig the DNS check is skipped with a note instead of failing', { skip }, () => {
  const r = run(['full'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\nPUBLIC_CHECK_SERVER_IP=${SERVER_IP}\nPUBLIC_CHECK_DIG=dig-that-does-not-exist\n`, noDig: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.curlStdin, /dns skipped: dig is not installed/);
});

test('without a ping URL nothing is sent; a failed ping does not change the result; an unknown sink only warns (NOTIFY_SINK)', { skip }, () => {
  const none = run(['quick']);
  assert.equal(none.status, 0);
  assert.doesNotMatch(none.curlArgs, /--data-binary/);
  const failedPing = run(['quick'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\n`, pingOk: false });
  assert.equal(failedPing.status, 0);
  assert.match(failedPing.stderr, /healthchecks\.io ping failed/);
  const sink = run(['quick'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\nNOTIFY_SINK=cloudwatch\n` });
  assert.equal(sink.status, 0);
  assert.match(sink.stderr, /unknown NOTIFY_SINK: cloudwatch/);
  assert.doesNotMatch(sink.curlArgs, /--data-binary/);
});

test('a bad argument exits 2', { skip }, () => {
  assert.equal(run(['bogus']).status, 2);
});

// Issue per outage (#1077). One state dir lives across the runs of a scenario, like /var/lib/project-standards/public-check.
const ghCalls = (r) => r.curlArgs.split('\n').filter((l) => /https:\/\/api\.github\.com\/repos\//.test(l));
const withState = (fn) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-check-state-'));
  try {
    fn(stateDir);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
};
const ENV = `${AWS_ENV}HEALTHCHECK_URL_PUBLIC=${HC}\n`;

test('an outage opens one issue, does not repeat it within the hour, comments hourly, and closes on recovery', { skip }, () => {
  withState((stateDir) => {
    const bad = hosts[1];
    const down = { env: ENV, failHosts: [bad], stateDir };
    const opened = run(['quick'], { ...down, now: '1000000' });
    assert.equal(opened.status, 1);
    const open = ghCalls(opened);
    assert.equal(open.length, 1);
    assert.match(open[0], /-X POST .*"title":"Uptime: .*is down".*"labels":\["area\/deploy"\].*repos\/sirloinbh\/project-standards\/issues$/);
    assert.ok(open[0].includes(`Uptime: ${bad} is down`));
    assert.match(opened.curlArgs, /ssm\.ap-northeast-2\.amazonaws\.com/);
    assert.match(opened.curlArgs, /sirloinbh\/shared\/github-ops-token/);

    const again = run(['quick'], { ...down, now: '1000000' + '' });
    assert.deepEqual(ghCalls(again), [], 'no second issue');
    const later = run(['quick'], { ...down, now: String(1000000 + 3599) });
    assert.deepEqual(ghCalls(later), [], 'no comment before an hour');

    const hourly = run(['quick'], { ...down, now: String(1000000 + 3600) });
    assert.equal(ghCalls(hourly).length, 1);
    assert.match(ghCalls(hourly)[0], /issues\/42\/comments$/);
    assert.match(ghCalls(hourly)[0], /Still down/);
    const next = run(['quick'], { ...down, now: String(1000000 + 3601) });
    assert.deepEqual(ghCalls(next), [], 'the hour restarts at the comment');

    const recovered = run(['quick'], { env: ENV, stateDir, now: String(1000000 + 7300) });
    assert.equal(recovered.status, 0);
    const calls = ghCalls(recovered);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /issues\/42\/comments$/);
    assert.match(calls[0], /Recovered/);
    assert.match(calls[1], /-X PATCH .*"state":"closed".*issues\/42$/);
    assert.deepEqual(fs.readdirSync(stateDir), [], 'the incident is cleared');

    const quiet = run(['quick'], { env: ENV, stateDir, now: String(1000000 + 7600) });
    assert.doesNotMatch(quiet.curlArgs, /ssm\.|api\.github\.com/, 'nothing failing and nothing open: no SSM or GitHub call');
  });
});

test('the token never appears in output or arguments, and the ping is still sent', { skip }, () => {
  withState((stateDir) => {
    const r = run(['quick'], { env: ENV, failHosts: [hosts[0]], stateDir });
    assert.equal(r.status, 1);
    assert.ok(r.curlConf.includes(TOKEN), 'the token goes to curl on standard input');
    for (const text of [r.stdout, r.stderr, r.curlArgs, r.curlStdin]) {
      assert.ok(!text.includes(TOKEN));
      assert.ok(!text.includes('fakesecret'));
    }
    assert.match(r.curlArgs, new RegExp(`${HC}/fail$`, 'm'));
  });
});

test('without the SSM key pair, a missing token, or a GitHub failure the issue part is skipped and the result and ping stay the same', { skip }, () => {
  const bad = { failHosts: [hosts[0]] };
  const noKeys = run(['quick'], { env: `HEALTHCHECK_URL_PUBLIC=${HC}\n`, ...bad });
  assert.equal(noKeys.status, 1);
  assert.doesNotMatch(noKeys.curlArgs, /ssm\.|api\.github\.com/);
  assert.match(noKeys.curlArgs, new RegExp(`${HC}/fail$`, 'm'));
  const noParam = run(['quick'], { env: ENV, ...bad, ssmOk: false });
  assert.equal(noParam.status, 1);
  assert.doesNotMatch(noParam.curlArgs, /api\.github\.com/);
  assert.equal(noParam.stderr.includes('could not'), false, 'a missing token is silent');
  const ghDown = run(['quick'], { env: ENV, ...bad, ghOk: false });
  assert.equal(ghDown.status, 1);
  assert.match(ghDown.stderr, /could not open the uptime issue/);
  assert.match(ghDown.curlArgs, new RegExp(`${HC}/fail$`, 'm'));
  assert.ok(!ghDown.stderr.includes(TOKEN));
  const okRun = run(['quick'], { env: ENV, ghOk: false });
  assert.equal(okRun.status, 0);
});

test('a quick run cannot close a DNS or certificate incident; the next full run does', { skip }, () => {
  withState((stateDir) => {
    const dnsEnv = `${ENV}PUBLIC_CHECK_SERVER_IP=${SERVER_IP}\n`;
    const opened = run(['full'], { env: dnsEnv, dnsWrong: [hosts[0]], stateDir });
    assert.equal(ghCalls(opened).length, 1);
    const quick = run(['quick'], { env: dnsEnv, stateDir, now: '1000100' });
    assert.deepEqual(ghCalls(quick), []);
    const full = run(['full'], { env: dnsEnv, stateDir, now: '1000200' });
    assert.equal(ghCalls(full).length, 2);
    assert.match(ghCalls(full)[1], /-X PATCH/);
  });
});
