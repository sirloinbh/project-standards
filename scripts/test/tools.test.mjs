// Ported from workout-memo scripts/test/project-github-auth.test.mjs for the shared tools/.
// Windows-only checks use fake gh and code commands, temporary USERPROFILE/APPDATA/LOCALAPPDATA,
// and a synthetic token; real authentication, installed tools, and VS Code are never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const tool = (name) => join(root, 'tools', name);
const windows = process.platform === 'win32';
// Hosted Windows runners can take over 20 seconds to start the first PowerShell process.
const processTimeoutMs = 60000;
// Harness bodies stay ASCII-only and read paths from the environment: Windows PowerShell 5.1
// reads a BOM-less .ps1 in the ANSI code page and cmd.exe misreads a UTF-8 BOM, so a
// non-ASCII checkout path must never be embedded in them.
const harnesses = {
  restore: `
$beforeConfig=$env:GH_CONFIG_DIR
$beforeGh=$env:GH_TOKEN
$beforeGithub=$env:GITHUB_TOKEN
$result=& $env:TEST_WRAPPER api user
$status=$LASTEXITCODE
@{status=$status;restored=($env:GH_CONFIG_DIR -eq $beforeConfig -and $env:GH_TOKEN -eq $beforeGh -and $env:GITHUB_TOKEN -eq $beforeGithub);result=($result | ConvertFrom-Json)} | ConvertTo-Json -Depth 5
`,
  terminal: `
. $env:TEST_TERMINAL_INIT
$company = gh api user --jq .login | ConvertFrom-Json
$personal = ghp api user --jq .login | ConvertFrom-Json
@{company=$company;personal=$personal;ghFunction=[bool](Get-Command gh -CommandType Function -ErrorAction SilentlyContinue);ghpFunction=[bool](Get-Command ghp -CommandType Function -ErrorAction SilentlyContinue)} | ConvertTo-Json -Depth 5
`,
};

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tools-test-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  const home = join(dir, 'home');
  mkdirSync(home);
  writeFileSync(
    join(bin, 'capture.mjs'),
    `const fs=await import('node:fs');const out={args:process.argv.slice(2),config:process.env.GH_CONFIG_DIR??null,ghToken:!!process.env.GH_TOKEN,githubToken:!!process.env.GITHUB_TOKEN,pinned:process.env.GH_TOKEN==="dummy-project-token",codex:process.env.CODEX_HOME??null};console.log(JSON.stringify(out));process.exit(Number(process.env.TEST_EXIT??0));`,
  );
  for (const name of ['gh', 'code'])
    writeFileSync(
      join(bin, `${name}.cmd`),
      `@echo off\r\n${name === 'gh' ? 'if "%~1 %~2"=="auth token" (if not "%~5 %~6"=="--user sirloinbh" exit /b 19\r\nif defined GH_TOKEN exit /b 23\r\nif defined GITHUB_TOKEN exit /b 24\r\nif defined TEST_TOKEN_FAIL (exit /b 1) else (echo dummy-project-token& exit /b 0))\r\n' : ''}"${process.execPath}" "%~dp0capture.mjs" %*\r\nexit /b %errorlevel%\r\n`,
    );
  return {
    dir,
    env: {
      ...process.env,
      HOME: home,
      PATH: bin + delimiter + process.env.PATH,
      LOCALAPPDATA: join(dir, 'appdata'),
      APPDATA: join(dir, 'roaming'),
      USERPROFILE: home,
      CODEX_HOME: join(dir, 'original-codex'),
      GH_CONFIG_DIR: join(dir, 'original-gh'),
      GH_TOKEN: 'dummy-gh-token',
      GITHUB_TOKEN: 'dummy-github-token',
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
const powershell = (args, env, input) => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ...args], { env, input, encoding: 'utf8', timeout: processTimeoutMs });
const cmd = (args, env) => spawnSync('cmd.exe', ['/d', '/c', ...args], { env, encoding: 'utf8', timeout: processTimeoutMs });

test('gh wrapper uses the personal config, pins sirloinbh, and keeps arguments', { skip: !windows }, () => {
  const f = fixture();
  try {
    const r = powershell([tool('gh-project.ps1'), 'api', 'user', '--jq', '.login'], f.env);
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim());
    assert.equal(got.config, join(f.env.USERPROFILE, '.config', 'gh-personal'));
    assert.equal(got.pinned, true);
    assert.equal(got.githubToken, false);
    assert.deepEqual(got.args, ['api', 'user', '--jq', '.login']);
  } finally {
    f.cleanup();
  }
});

test('gh wrapper propagates failures and refuses another account', { skip: !windows }, () => {
  const f = fixture();
  try {
    assert.equal(powershell([tool('gh-project.ps1'), 'api', 'user'], { ...f.env, TEST_EXIT: '17' }).status, 17);
    const r = powershell([tool('gh-project.ps1'), 'api', 'user'], { ...f.env, TEST_TOKEN_FAIL: '1' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /sirloinbh/);
  } finally {
    f.cleanup();
  }
});

test('gh wrapper forwards Git credential requests on stdin', { skip: !windows }, () => {
  const f = fixture();
  try {
    writeFileSync(join(f.dir, 'bin', 'capture.mjs'), `let input='';for await(const chunk of process.stdin)input+=chunk;console.log(JSON.stringify({input,args:process.argv.slice(2)}));`);
    const r = powershell([tool('gh-project.ps1'), 'auth', 'git-credential', 'get'], f.env, 'protocol=https\nhost=github.com\n\n');
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim());
    assert.match(got.input, /host=github.com/);
    assert.deepEqual(got.args, ['auth', 'git-credential', 'get']);
  } finally {
    f.cleanup();
  }
});

test('gh wrapper restores the calling PowerShell environment', { skip: !windows }, () => {
  const f = fixture();
  try {
    const harness = join(f.dir, 'restore.ps1');
    writeFileSync(harness, harnesses.restore);
    const r = powershell([harness], { ...f.env, TEST_WRAPPER: tool('gh-project.ps1') });
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim());
    assert.equal(got.restored, true);
    assert.equal(got.result.pinned, true);
  } finally {
    f.cleanup();
  }
});

test('project terminal keeps company gh and finds ghp next to itself in any install folder', { skip: !windows }, () => {
  const f = fixture();
  try {
    // Install into an arbitrary folder (not gh-workout-memo) to prove the path is not hardcoded.
    const installed = join(f.dir, 'some tools folder');
    mkdirSync(installed);
    for (const name of ['gh-project.ps1', 'project-terminal.ps1']) writeFileSync(join(installed, name), readFileSync(tool(name)));
    const harness = join(f.dir, 'terminal.ps1');
    writeFileSync(harness, harnesses.terminal);
    const r = powershell([harness], { ...f.env, TEST_TERMINAL_INIT: join(installed, 'project-terminal.ps1') });
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim());
    assert.equal(got.ghFunction, false);
    assert.equal(got.ghpFunction, true);
    assert.equal(got.company.config, join(f.env.APPDATA, 'GitHub CLI'));
    assert.equal(got.company.ghToken, false);
    assert.equal(got.company.codex, join(f.env.LOCALAPPDATA, 'Codex-Account-B'));
    assert.equal(got.personal.config, join(f.env.USERPROFILE, '.config', 'gh-personal'));
    assert.equal(got.personal.pinned, true);
  } finally {
    f.cleanup();
  }
});

test('launcher --project opens a sirloinbh project with company gh, personal Codex, and the personal data folder', { skip: !windows }, () => {
  const f = fixture();
  try {
    const project = join(f.dir, 'study-log');
    mkdirSync(project);
    const r = cmd([tool('open-vscode-account-b.cmd'), '--project', project], f.env);
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim());
    assert.equal(got.config, join(f.env.APPDATA, 'GitHub CLI'));
    assert.equal(got.ghToken, false);
    assert.equal(got.githubToken, false);
    assert.equal(got.codex, join(f.env.LOCALAPPDATA, 'Codex-Account-B'));
    assert.equal(got.args[1], join(f.env.LOCALAPPDATA, 'VSCode-Account-B-workout-memo'));
    assert.equal(got.args.at(-1), project);
  } finally {
    f.cleanup();
  }
});

test('launcher keeps another folder\'s GitHub environment and propagates code failures', { skip: !windows }, () => {
  const f = fixture();
  try {
    const other = join(f.dir, 'other project');
    mkdirSync(other);
    const r = cmd([tool('open-vscode-account-b.cmd'), other], f.env);
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim());
    assert.equal(got.config, f.env.GH_CONFIG_DIR);
    assert.equal(got.ghToken, true);
    assert.equal(got.args[1], join(f.env.LOCALAPPDATA, 'VSCode-Account-B'));
    assert.equal(cmd([tool('open-vscode-account-b.cmd'), '--project', other], { ...f.env, TEST_EXIT: '17' }).status, 17);
    assert.equal(cmd([tool('open-vscode-account-b.cmd'), '--project'], f.env).status, 2);
  } finally {
    f.cleanup();
  }
});

test('install copies the tools, keeps unchanged files, and backs up replaced ones', { skip: !windows }, () => {
  const f = fixture();
  try {
    const dest = join(f.dir, 'sirloinbh-tools');
    const first = powershell([tool('install.ps1'), '-Destination', dest], f.env);
    assert.equal(first.status, 0, first.stderr);
    for (const name of ['gh-project.ps1', 'project-terminal.ps1', 'open-vscode-account-b.cmd', 'set-credential-helper.ps1']) assert.ok(existsSync(join(dest, name)), name);
    const second = powershell([tool('install.ps1'), '-Destination', dest], f.env);
    assert.match(second.stdout, /unchanged {2}gh-project\.ps1/);
    writeFileSync(join(dest, 'gh-project.ps1'), '# edited\n');
    const third = powershell([tool('install.ps1'), '-Destination', dest], f.env);
    assert.match(third.stdout, /backed up {2}gh-project\.ps1 -> gh-project\.ps1\.bak-\d{8}-\d{6}/);
    assert.ok(readdirSync(dest).some((n) => n.startsWith('gh-project.ps1.bak-')));
    assert.equal(readFileSync(join(dest, 'gh-project.ps1'), 'utf8'), readFileSync(tool('gh-project.ps1'), 'utf8'));
  } finally {
    f.cleanup();
  }
});

test('set-credential-helper points only the repository config at the chosen wrapper', { skip: !windows }, () => {
  const f = fixture();
  try {
    const repo = join(f.dir, 'repo');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q', repo]);
    execFileSync('git', ['-C', repo, 'config', '--local', 'credential.https://github.com.helper', 'old-helper']);
    const r = powershell([tool('set-credential-helper.ps1'), '-Repository', repo, '-ToolsDir', join(root, 'tools')], f.env);
    assert.equal(r.status, 0, r.stderr);
    // Do not trim: the first helper is intentionally an empty line.
    const helpers = execFileSync('git', ['-C', repo, 'config', '--local', '--get-all', 'credential.https://github.com.helper'], { encoding: 'utf8' }).replace(/\r?\n$/, '').split(/\r?\n/);
    assert.deepEqual(helpers[0], '');
    assert.match(helpers[1], /^!powershell\.exe -NoProfile -ExecutionPolicy Bypass -File .*\/tools\/gh-project\.ps1 auth git-credential$/);
    assert.equal(helpers.length, 2, 'the old helper is replaced, not appended');
    assert.equal(execFileSync('git', ['-C', repo, 'config', '--local', 'credential.https://github.com.username'], { encoding: 'utf8' }).trim(), 'sirloinbh');
  } finally {
    f.cleanup();
  }
});

test('the VS Code settings template opens terminals with the shared tools folder', () => {
  const settings = JSON.parse(readFileSync(join(root, 'templates/common/.vscode/settings.json.tmpl'), 'utf8'));
  const env = settings['terminal.integrated.env.windows'];
  assert.equal(env.GH_CONFIG_DIR, '${env:APPDATA}\\GitHub CLI');
  assert.equal(env.GH_TOKEN, null);
  assert.equal(env.CODEX_HOME, '${env:LOCALAPPDATA}\\Codex-Account-B');
  const profile = settings['terminal.integrated.profiles.windows'][settings['terminal.integrated.defaultProfile.windows']];
  assert.ok(profile.args.includes('${env:LOCALAPPDATA}\\sirloinbh-tools\\project-terminal.ps1'));
});

test('harness scripts stay ASCII-only and read paths from the environment', () => {
  for (const [name, body] of Object.entries(harnesses)) {
    assert.equal([...body].find((c) => c.codePointAt(0) > 0x7f), undefined, name);
    assert.ok(!body.includes(root), name);
    assert.match(body, /\$env:TEST_(WRAPPER|TERMINAL_INIT)\b/, name);
  }
});

test('tools contain no project-specific install path', () => {
  for (const name of ['gh-project.ps1', 'project-terminal.ps1', 'open-vscode-account-b.cmd', 'install.ps1', 'set-credential-helper.ps1']) {
    // Comments may mention the old folder (install.ps1 explains it never touches it); code may not.
    const code = readFileSync(tool(name), 'utf8').split('\n').filter((l) => !/^\s*(#|rem\b)/i.test(l)).join('\n');
    assert.doesNotMatch(code, /gh-workout-memo/, name);
  }
});
