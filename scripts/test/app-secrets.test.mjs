// tools/app-secrets.mjs (#265, ADR-0010): the shared Claude API key in SSM, copied into local .env files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENV_KEY, PARAMETER, claudeApps, hasEnvValue, run, setEnvLine } from '../../tools/app-secrets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VALUE = 'fake-claude-key-value';

// A fake AWS CLI: records its arguments (and the file:// value it was given) and answers SSM calls.
function fakeAws(dir, { fail = false } = {}) {
  const script = path.join(dir, 'fake-aws.mjs');
  fs.writeFileSync(
    script,
    `import fs from 'node:fs';
const args = process.argv.slice(2);
const file = args.find((a) => a.startsWith('file://'));
fs.appendFileSync(${JSON.stringify(path.join(dir, 'aws.log'))}, JSON.stringify({ args, fileValue: file ? fs.readFileSync(file.slice(7), 'utf8') : null }) + '\\n');
if (${fail}) { process.stderr.write('ParameterNotFound'); process.exit(254); }
if (args.includes('Parameter.Value')) process.stdout.write(${JSON.stringify(VALUE + '\n')});
else if (args.includes('Parameter.LastModifiedDate')) process.stdout.write('2026-10-27T05:00:00+09:00\\n');
`,
  );
  return script;
}
const calls = (dir) => fs.readFileSync(path.join(dir, 'aws.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

function workspace(fn, options) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-secrets-test-'));
  const before = process.env.APP_SECRETS_AWS;
  process.env.APP_SECRETS_AWS = fakeAws(dir, options);
  const lines = [];
  return Promise.resolve(fn({ dir, base: path.join(dir, 'clones'), lines, log: (l) => lines.push(l) })).finally(() => {
    if (before === undefined) delete process.env.APP_SECRETS_AWS;
    else process.env.APP_SECRETS_AWS = before;
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

test('only active apps with features.claude are targets (study-log today)', () => {
  assert.deepEqual(claudeApps(root), ['study-log']);
});

test('setEnvLine replaces or appends one key and keeps other lines and CRLF', () => {
  assert.equal(setEnvLine('A=1\nANTHROPIC_API_KEY=old\nB=2\n', ENV_KEY, 'new'), 'A=1\nANTHROPIC_API_KEY=new\nB=2\n');
  assert.equal(setEnvLine('A=1\r\nB=2\r\n', ENV_KEY, 'v'), 'A=1\r\nB=2\r\nANTHROPIC_API_KEY=v\r\n');
  assert.equal(setEnvLine('', ENV_KEY, 'v'), 'ANTHROPIC_API_KEY=v\n');
  assert.ok(hasEnvValue('ANTHROPIC_API_KEY=x\n', ENV_KEY));
  assert.ok(!hasEnvValue('ANTHROPIC_API_KEY=\n', ENV_KEY));
});

test('pull writes the SSM value into the app .env and never logs it', () =>
  workspace(async ({ dir, base, lines, log }) => {
    fs.mkdirSync(path.join(base, 'study-log'), { recursive: true });
    fs.writeFileSync(path.join(base, 'study-log/.env'), 'PORT=3102\nANTHROPIC_API_KEY=\n');
    assert.equal(await run(['pull', '--profile', 'me-personal', '--base', base], { root, log }), 0);
    assert.equal(fs.readFileSync(path.join(base, 'study-log/.env'), 'utf8'), `PORT=3102\nANTHROPIC_API_KEY=${VALUE}\n`);
    const [call] = calls(dir);
    assert.deepEqual(call.args, ['ssm', 'get-parameter', '--name', PARAMETER, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text', '--region', 'ap-northeast-2', '--profile', 'me-personal']);
    assert.ok(!lines.join('\n').includes(VALUE));
    assert.deepEqual(lines, ['study-log/.env ANTHROPIC_API_KEY: 넣음']);
  }));

test('pull skips an app that is not cloned and refuses an app without features.claude', () =>
  workspace(async ({ base, lines, log }) => {
    assert.equal(await run(['pull', '--profile', 'p', '--base', base], { root, log }), 0);
    assert.match(lines[0], /^study-log: .*클론이 없어 건너뜀$/);
    await assert.rejects(run(['pull', '--profile', 'p', '--app', 'workout-memo', '--base', base], { root, log }), /features\.claude가 꺼진 앱/);
  }));

test('set passes the value through a temporary file that is removed afterwards', () =>
  workspace(async ({ dir, lines, log }) => {
    assert.equal(await run(['set', '--profile', 'p'], { root, log, input: async () => `  ${VALUE}\r\n` }), 0);
    const [call] = calls(dir);
    assert.deepEqual(call.args.slice(0, 7), ['ssm', 'put-parameter', '--name', PARAMETER, '--type', 'SecureString', '--overwrite']);
    assert.equal(call.fileValue, VALUE);
    assert.ok(!call.args.includes(VALUE), 'the value must not be an argument');
    const file = call.args.find((a) => a.startsWith('file://')).slice(7);
    assert.ok(!fs.existsSync(file), 'the temporary file is removed');
    assert.ok(!lines.join('\n').includes(VALUE));
    await assert.rejects(run(['set', '--profile', 'p'], { root, log, input: async () => '\n' }), /표준 입력으로 키 값을 넘기세요/);
  }));

test('check reports presence only and fails when SSM or a .env is missing', () =>
  workspace(async ({ base, lines, log }) => {
    fs.mkdirSync(path.join(base, 'study-log'), { recursive: true });
    fs.writeFileSync(path.join(base, 'study-log/.env'), `ANTHROPIC_API_KEY=${VALUE}\n`);
    assert.equal(await run(['check', '--profile', 'p', '--base', base], { root, log }), 0);
    assert.deepEqual(lines, [`SSM ${PARAMETER}: 있음 (마지막 변경 2026-10-27T05:00:00+09:00)`, 'study-log/.env ANTHROPIC_API_KEY: 있음']);
  }));

test('check fails without the parameter, and a profile is required', () =>
  workspace(
    async ({ base, lines, log }) => {
      assert.equal(await run(['check', '--profile', 'p', '--base', base], { root, log }), 1);
      assert.match(lines[0], /읽지 못함 — aws ssm get-parameter 실패 \(종료 코드 254\): ParameterNotFound/);
      assert.equal(lines[1], 'study-log/.env ANTHROPIC_API_KEY: 없음');
      const saved = process.env.SIRLOINBH_AWS_PROFILE;
      delete process.env.SIRLOINBH_AWS_PROFILE;
      try {
        await assert.rejects(run(['check'], { root, log }), /개인 AWS 프로필을 지정하세요/);
      } finally {
        if (saved !== undefined) process.env.SIRLOINBH_AWS_PROFILE = saved;
      }
    },
    { fail: true },
  ));
