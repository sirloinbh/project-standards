// tools/app-secrets.mjs (#265, ADR-0010): the shared Claude API key in SSM, copied into the one central .env.
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
  // A throwaway copy of this repository's registry, so pull never writes the real .env.
  const central = path.join(dir, 'project-standards');
  fs.mkdirSync(path.join(central, 'registry'), { recursive: true });
  fs.copyFileSync(path.join(root, 'registry/projects.json'), path.join(central, 'registry/projects.json'));
  return Promise.resolve(fn({ dir, central, lines, log: (l) => lines.push(l) })).finally(() => {
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

test('pull writes the SSM value into the central .env and never logs it', () =>
  workspace(async ({ dir, central, lines, log }) => {
    fs.writeFileSync(path.join(central, '.env'), 'OTHER=1\nANTHROPIC_API_KEY=\n');
    assert.equal(await run(['pull', '--profile', 'me-personal'], { root: central, log }), 0);
    assert.equal(fs.readFileSync(path.join(central, '.env'), 'utf8'), `OTHER=1\nANTHROPIC_API_KEY=${VALUE}\n`);
    const [call] = calls(dir);
    assert.deepEqual(call.args, ['ssm', 'get-parameter', '--name', PARAMETER, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text', '--region', 'ap-northeast-2', '--profile', 'me-personal']);
    assert.ok(!lines.join('\n').includes(VALUE));
    assert.deepEqual(lines, ['project-standards/.env ANTHROPIC_API_KEY: written']);
  }));

test('pull creates the central .env when it does not exist yet, and leaves the app clones alone', () =>
  workspace(async ({ dir, central, lines, log }) => {
    fs.mkdirSync(path.join(dir, 'study-log'));
    assert.equal(await run(['pull', '--profile', 'p'], { root: central, log }), 0);
    assert.equal(fs.readFileSync(path.join(central, '.env'), 'utf8'), `ANTHROPIC_API_KEY=${VALUE}\n`);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'study-log')), []);
    assert.deepEqual(lines, ['project-standards/.env ANTHROPIC_API_KEY: written']);
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
    await assert.rejects(run(['set', '--profile', 'p'], { root, log, input: async () => '\n' }), /Pass the key value on standard input/);
  }));

test('check reports presence only and names the apps that read the key', () =>
  workspace(async ({ central, lines, log }) => {
    fs.writeFileSync(path.join(central, '.env'), `ANTHROPIC_API_KEY=${VALUE}\n`);
    assert.equal(await run(['check', '--profile', 'p'], { root: central, log }), 0);
    assert.deepEqual(lines, [`SSM ${PARAMETER}: present (last modified 2026-10-27T05:00:00+09:00)`, "project-standards/.env ANTHROPIC_API_KEY: present", "Apps that read this key: study-log"]);
    assert.ok(!lines.join('\n').includes(VALUE));
  }));

test('check fails without the parameter, and a profile is required', () =>
  workspace(
    async ({ central, lines, log }) => {
      assert.equal(await run(['check', '--profile', 'p'], { root: central, log }), 1);
      assert.match(lines[0], /could not read — aws ssm get-parameter failed \(exit code 254\): ParameterNotFound/);
      assert.equal(lines[1], 'project-standards/.env ANTHROPIC_API_KEY: missing');
      const saved = process.env.SIRLOINBH_AWS_PROFILE;
      delete process.env.SIRLOINBH_AWS_PROFILE;
      try {
        await assert.rejects(run(['check'], { root, log }), /personal AWS profile/);
      } finally {
        if (saved !== undefined) process.env.SIRLOINBH_AWS_PROFILE = saved;
      }
    },
    { fail: true },
  ));

// ADR-0014: keys an app tags with @ssm= in .env.example, and set <parameter>.
const APP_EXAMPLE = [
  '# @desc Public data key @secret @used=backend @ssm=/sirloinbh/shared/data-go-kr-service-key',
  'HOLIDAY_API_KEY=',
  '# @desc Tiingo token @secret @used=backend @ssm=/sirloinbh/money-ledger/tiingo-api-key',
  'TIINGO_API_KEY=',
  '# @desc Not in SSM @secret @used=backend',
  'LOCAL_KEY=',
  '',
].join('\n');

test('pull <app> writes every @ssm= key into the app clone .env, and only names the keys', () =>
  workspace(async ({ dir, central, lines, log }) => {
    const app = path.join(dir, 'money-ledger');
    fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, '.env.example'), APP_EXAMPLE);
    fs.writeFileSync(path.join(app, '.env'), 'LOCAL_KEY=keep\r\nTIINGO_API_KEY=old\r\n');
    assert.equal(await run(['pull', 'money-ledger', '--profile', 'p'], { root: central, log }), 0);
    assert.equal(fs.readFileSync(path.join(app, '.env'), 'utf8'), `LOCAL_KEY=keep\r\nTIINGO_API_KEY=${VALUE}\r\nHOLIDAY_API_KEY=${VALUE}\r\n`);
    assert.deepEqual(calls(dir).map((c) => c.args[3]), ['/sirloinbh/shared/data-go-kr-service-key', '/sirloinbh/money-ledger/tiingo-api-key']);
    assert.deepEqual(lines, ['money-ledger/.env HOLIDAY_API_KEY: written', 'money-ledger/.env TIINGO_API_KEY: written']);
    assert.ok(!fs.existsSync(path.join(central, '.env')), 'the central .env is not touched');
  }));

test('check <app> reports each tagged key in SSM and in the app .env, with --dir for another clone', () =>
  workspace(async ({ dir, central, lines, log }) => {
    const app = path.join(dir, 'elsewhere');
    fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, '.env.example'), APP_EXAMPLE);
    fs.writeFileSync(path.join(app, '.env'), `HOLIDAY_API_KEY=${VALUE}\n`);
    assert.equal(await run(['check', 'money-ledger', '--dir', app, '--profile', 'p'], { root: central, log }), 1, 'TIINGO_API_KEY is missing locally');
    assert.deepEqual(lines, [
      'SSM /sirloinbh/shared/data-go-kr-service-key: present (last modified 2026-10-27T05:00:00+09:00)',
      'money-ledger/.env HOLIDAY_API_KEY: present',
      'SSM /sirloinbh/money-ledger/tiingo-api-key: present (last modified 2026-10-27T05:00:00+09:00)',
      'money-ledger/.env TIINGO_API_KEY: missing',
    ]);
    assert.ok(!lines.join('\n').includes(VALUE));
  }));

test('an app may read only shared keys and its own, and pull fails before writing anything', () =>
  workspace(async ({ dir, central, log }) => {
    const app = path.join(dir, 'study-log');
    fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, '.env.example'), '# @desc x @secret @ssm=/sirloinbh/money-ledger/tiingo-api-key\nTIINGO_API_KEY=\n');
    await assert.rejects(run(['pull', 'study-log', '--profile', 'p'], { root: central, log }), /belongs to money-ledger/);
    assert.ok(!fs.existsSync(path.join(app, '.env')));
    assert.ok(!fs.existsSync(path.join(dir, 'aws.log')), 'no AWS call');
    await assert.rejects(run(['pull', 'not-an-app', '--profile', 'p'], { root: central, log }), /not an active app/);
  }));

test('set <parameter> stores any shared or app key, and refuses other names before reading the value', () =>
  workspace(async ({ dir, central, lines, log }) => {
    assert.equal(await run(['set', '/sirloinbh/life-journal/tmdb-read-access-token', '--profile', 'p'], { root: central, log, input: async () => VALUE }), 0);
    assert.equal(calls(dir)[0].args[3], '/sirloinbh/life-journal/tmdb-read-access-token');
    assert.equal(calls(dir)[0].fileValue, VALUE);
    for (const bad of ['/sirloinbh/anthropic-api-key', '/sirloinbh/unknown-app/key', '/other/shared/key', '/sirloinbh/shared/Upper_Case']) {
      let asked = false;
      await assert.rejects(run(['set', bad, '--profile', 'p'], { root: central, log, input: async () => ((asked = true), VALUE) }), Error, bad);
      assert.ok(!asked, `${bad}: the value is not read`);
    }
    assert.ok(!lines.join('\n').includes(VALUE));
  }));

test('the shared Claude key moved to /sirloinbh/shared/ (ADR-0014)', () => {
  assert.equal(PARAMETER, '/sirloinbh/shared/anthropic-api-key');
});
