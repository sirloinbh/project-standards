import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALLOW_MARKER, isEnvFile, scan, scanHistory, scanText } from '../secret-scan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'scripts/secret-scan.mjs');

// Fake values are assembled at run time so this file itself never holds a matching string.
const join = (...parts) => parts.join('');
const FAKES = {
  'github-token': join('gh', 'p_', 'A1b2'.repeat(9)),
  'github-pat': join('github', '_pat_', 'x9'.repeat(30)),
  'anthropic-key': join('sk-', 'ant-', 'api03-', 'Zz9_'.repeat(20)),
  'openai-key': join('sk-', 'proj-', 'Q7w'.repeat(15)),
  'aws-access-key': join('AK', 'IA', 'ABCDEFGH23456789'),
  'aws-secret-key': join('aws_secret', '_access_key = ', 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY'),
  'npm-token': join('np', 'm_', 'a1B2c3'.repeat(6)),
  'slack-token': join('xo', 'xb-', '1234567890-abcdef'),
  'google-api-key': join('AI', 'za', 'Sy', 'A'.repeat(33)),
  'stripe-live-key': join('sk', '_live_', '4eC39HqLyjWDarjtT1zdp7dc'),
  'private-key': join('-----BEGIN ', 'OPENSSH ', 'PRIVATE KEY-----'),
};

function repo(files, { git = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-'));
  for (const [rel, value] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), value);
  }
  if (git) {
    const run = (...args) => assert.equal(spawnSync('git', args, { cwd: dir }).status, 0, `git ${args.join(' ')}`);
    run('init', '-q');
    run('add', '-A');
    run('-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'init');
  }
  return dir;
}
const withRepo = (files, fn, options) => {
  const dir = repo(files, options);
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('every rule matches its fake value and reports the line without the value', () => {
  for (const [id, value] of Object.entries(FAKES)) {
    const findings = scanText(`first line\nconst value = "${value}";\n`);
    assert.deepEqual(findings.map((f) => [f.line, f.rule.id]), [[2, id]], id);
  }
  withRepo({ 'src/config.ts': `export const token = '${FAKES['github-token']}';\n` }, (dir) => {
    const [error] = scan(dir);
    assert.match(error, /^src\/config\.ts:1: GitHub 토큰\(github-token\)/);
    assert.ok(!error.includes(FAKES['github-token']), 'the value must not be printed');
  });
});

test('ordinary code, placeholders and masked values are not findings', () => {
  const text = [
    'NODE_AUTH_TOKEN=',
    'ANTHROPIC_API_KEY=<api-key>',
    '- Token: gho_************************************',
    'const prefix = "ghp_";',
    'see https://docs.github.com/en/code-security',
    'POSTGRES_PASSWORD: test',
    '-----BEGIN PUBLIC KEY-----',
  ].join('\n');
  assert.deepEqual(scanText(text), []);
});

test('the allow marker skips a deliberate fake value on that line only', () => {
  const text = `ok = "${FAKES['npm-token']}" // ${ALLOW_MARKER}\nbad = "${FAKES['npm-token']}"\n`;
  assert.deepEqual(scanText(text).map((f) => f.line), [2]);
});

test('committed .env files fail but examples and templates do not', () => {
  assert.ok(isEnvFile('.env'));
  assert.ok(isEnvFile('backend/.env.production'));
  for (const ok of ['.env.example', 'frontend/.env.sample', '.env.example.tmpl', 'docs/env.md', '.envrc.md']) assert.ok(!isEnvFile(ok), ok);
  withRepo({ '.env': 'PORT=3000\n', '.env.example': 'PORT=\n' }, (dir) => {
    assert.deepEqual(scan(dir), ['.env: .env 파일이 커밋 대상에 있습니다. 값은 서버·PC에만 두고 .env.example만 커밋하세요']);
  });
});

test('in a git repository only tracked files are scanned, and binary or installed files are skipped', () => {
  withRepo(
    {
      '.gitignore': '.env\nlocal-notes.txt\n',
      '.env': `TOKEN=${FAKES['github-token']}\n`,
      'local-notes.txt': FAKES['anthropic-key'],
      'image.png': Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(FAKES['github-token'])]),
      'src/app.ts': 'export {};\n',
    },
    (dir) => {
      fs.mkdirSync(path.join(dir, 'node_modules/pkg'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'node_modules/pkg/index.js'), FAKES['npm-token']);
      assert.deepEqual(scan(dir), []);
    },
    { git: true },
  );
});

test('history mode finds a value that was committed and later removed', () => {
  withRepo(
    { 'config.js': `module.exports = '${FAKES['aws-access-key']}';\n` },
    (dir) => {
      fs.writeFileSync(path.join(dir, 'config.js'), 'module.exports = process.env.KEY;\n');
      spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', 'commit', '-qam', 'remove'], { cwd: dir });
      assert.deepEqual(scan(dir), []);
      const history = scanHistory(dir);
      assert.equal(history.length, 1);
      assert.match(history[0], /^[0-9a-f]+ config\.js: AWS 액세스 키 ID\(aws-access-key\) 모양의 값이 추가된 적이 있습니다$/);
    },
    { git: true },
  );
});

test('the command exits 1 with findings and 0 on a clean tree, and this repository is clean', () => {
  withRepo({ 'a.txt': FAKES['slack-token'] }, (dir) => {
    const result = spawnSync(process.execPath, [script, '--root', dir], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /a\.txt:1: Slack 토큰/);
    assert.ok(!result.stderr.includes(FAKES['slack-token']));
  });
  const clean = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /의심 항목 없음/);
});

test('apps and infrastructure repositories receive the scanner and run it in CI', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8'));
  assert.equal(index.vendor.files['.standards/secret-scan.mjs'], 'scripts/secret-scan.mjs');
  for (const workflow of ['reusable-app-ci.yml', 'reusable-infra-ci.yml']) {
    const text = fs.readFileSync(path.join(root, '.github/workflows', workflow), 'utf8');
    assert.match(text, /run: node \.standards\/secret-scan\.mjs/, workflow);
  }
  assert.match(fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8'), /run: node scripts\/secret-scan\.mjs/);
});
