import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { findInstall, npmCommand, splitCommands } from '../../templates/common/.claude/hooks/block-package-installs.mjs';

// The PreToolUse hook that parses commands to block package installs (#162, docs/agent-guardrails.md).
const root = path.join(import.meta.dirname, '..', '..');
const HOOK = 'templates/common/.claude/hooks/block-package-installs.mjs';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const BLOCKED = {
  // The cases the prefix deny rules miss (#162 completion criteria).
  'npm --silent install': 'npm install',
  'npm --silent install --help': 'npm install',
  'sh -c "npm i x"': 'npm install',
  "bash -lc 'npm ci --ignore-scripts=false'": 'npm ci with install scripts',
  '"C:\\Program Files\\nodejs\\npm.cmd" install': 'npm install',
  '& "C:\\Program Files\\nodejs\\npm.cmd" ci --no-ignore-scripts': 'npm ci with install scripts',
  'C:\\nodejs\\NPM.CMD i react': 'npm install',
  '/c/Program\\ Files/Volta/npm install': 'npm install',
  // Options with values, aliases and abbreviations npm accepts.
  'npm --prefix frontend install': 'npm install',
  'npm -w app install': 'npm install',
  'npm --loglevel=silent add react': 'npm install',
  'npm u': 'npm update',
  'npm upd': 'npm update',
  'npm ic --ignore-scripts false': 'npm ci with install scripts',
  // Forms npm resolves to the same setting, and the environment variables that override .npmrc.
  'npm ci --no-ignore': 'npm ci with install scripts',
  'npm ci --ignore-s=false': 'npm ci with install scripts',
  'npm ci -ignore-scripts=false': 'npm ci with install scripts',
  'npm ci --no-no-no-ignore-scripts': 'npm ci with install scripts',
  'npm_config_ignore_scripts=false npm ci': 'npm ci with install scripts',
  'NPM_CONFIG_IGNORE_SCRIPTS=false npm ci': 'npm ci with install scripts',
  'env npm_config_allow_scripts=esbuild npm ci': 'npm ci with install scripts',
  'cross-env npm_config_ignore_scripts=false npm ci': 'npm ci with install scripts',
  'export npm_config_ignore_scripts=false && npm ci': 'npm ci with install scripts',
  '$env:npm_config_ignore_scripts="false"; npm ci': 'npm ci with install scripts',
  '$env:npm_config_ignore_scripts = "false"; npm ci': 'npm ci with install scripts',
  'npm_config_ignore_scripts=false sh -c "npm ci"': 'npm ci with install scripts',
  'npm_config_ignore_scripts=0 npm ci': 'npm ci with install scripts',
  'npm_config_ignore_scripts=null npm ci': 'npm ci with install scripts',
  'env npm_config_ignore_scripts=undefined npm ci': 'npm ci with install scripts',
  'env npm_config_ignore-scripts=false npm ci': 'npm ci with install scripts',
  'Set-Item Env:npm_config_ignore_scripts false; npm ci': 'npm ci with install scripts',
  "[Environment]::SetEnvironmentVariable('npm_config_ignore_scripts','false'); npm ci": 'npm ci with install scripts',
  '${env:npm_config_ignore_scripts}="false"; npm ci': 'npm ci with install scripts',
  'npm ci --NO-ignore-scripts': 'npm ci with install scripts',
  'npm ci ---ignore-scripts=false': 'npm ci with install scripts',
  'env FOO-BAR=1 npm i': 'npm install',
  'npm ci && npm i x': 'npm install',
  'sh -c "npm ci; npm rebuild"': 'npm rebuild',
  'npm ci --allow-scripts=esbuild': 'npm ci with install scripts',
  'npm --no-ignore-scripts ci': 'npm ci with install scripts',
  'npm ci --dangerously-allow-all-scripts': 'npm ci with install scripts',
  'npm sit': 'npm install-ci-test',
  'npm unlink x': 'npm uninstall',
  'npm rb': 'npm rebuild',
  'npm installTest': 'npm install-test',
  'npm x cowsay': 'npm exec',
  'npm create vite': 'npm init',
  'npm audit fix': 'npm audit fix',
  // Chains, wrappers and nested shells.
  'npm run check && npm i x': 'npm install',
  'echo $(npm i x)': 'npm install',
  'FOO=1 timeout 5 npx --version': 'npx',
  'env -i PATH=/bin npm i': 'npm install',
  'env -S "npm i"': 'npm install',
  'sudo -u root npm install -g x': 'npm install',
  'nohup yarn &': 'yarn',
  'echo install | xargs npm': 'xargs npm',
  'cmd /c "npm.cmd install"': 'npm install',
  'pwsh -NoProfile -ExecutionPolicy Bypass -Command "npm i"': 'npm install',
  'powershell.exe -c npm i': 'npm install',
  [`pwsh -EncodedCommand ${Buffer.from('npm install', 'utf16le').toString('base64')}`]: 'npm install',
  'Invoke-Expression "npm i x"': 'npm install',
  "iex 'npm i'": 'npm install',
  'eval "npm i"': 'npm install',
  'Start-Process npm -ArgumentList "install","x" -Wait': 'npm install',
  'Start-Process -FilePath npm.cmd -ArgumentList "update"': 'npm update',
  'Get-ChildItem | ForEach-Object { npm i $_.Name }': 'npm install',
  'node C:/nodejs/node_modules/npm/bin/npm-cli.js i': 'npm install',
  'volta run npm install': 'npm install',
  'pnpm add x': 'pnpm',
  'bunx x': 'bunx',
  'corepack enable': 'corepack',
  'cd frontend\nnpm i': 'npm install',
};

const ALLOWED = [
  // #375: installs exactly what the lockfile pins, with install scripts off.
  'npm ci',
  'npm ci --ignore-scripts',
  'npm --silent ci',
  'npm -w backend ci',
  'npm clean-install',
  'npm ic',
  'npm ci --no-no-ignore-scripts',
  'npm ci --ignore-scripts=true',
  'npm ci -d',
  'npm_config_ignore_scripts=true npm ci',
  'npm_config_ignore_scripts=falsey npm ci',
  'npm_config_ignore_scripts=false npm ls',
  'npm ci --omit=dev',
  'npm ci --allow-same-version',
  'npm run check',
  'npm run install-deps',
  'npm ls',
  'npm test',
  'npm view react version',
  'npm outdated',
  'npm audit',
  'npm --version',
  'npm -w backend run build',
  'npm --prefix frontend test',
  'node --test scripts/test/*.test.mjs',
  'git commit -m "npm install 금지 문서; npm i 설명"',
  "git commit -m \"$(cat <<'EOF'\nfeat: npm install 차단\n\n- npm i x; yarn add y\nEOF\n)\"",
  "git commit -m @'\nnpm install 막기 & npm ci\n'@",
  'echo hi # npm install',
  'command -v npm',
  'grep -rn "npm install" docs',
  'node -e "console.log(1)"',
  'pwsh -File scripts/check.ps1',
  '',
];

test('npm commands resolve the way npm resolves them', () => {
  assert.equal(npmCommand('i'), 'install');
  assert.equal(npmCommand('isntall'), 'install');
  assert.equal(npmCommand('run'), 'run');
  assert.equal(npmCommand('run-script'), 'run');
  assert.equal(npmCommand('ls'), 'ls');
  assert.equal(npmCommand('in'), 'install');
  assert.equal(npmCommand('frontend'), undefined);
  assert.equal(npmCommand('ex'), undefined, 'ambiguous prefixes do not resolve');
});

test('the command splitter keeps quoted text and skips here-documents and comments', () => {
  assert.deepEqual(splitCommands('a "b c" \'d\' && e|f; g'), [['a', 'b c', 'd'], ['e'], ['f'], ['g']]);
  assert.deepEqual(splitCommands('cat <<EOF\nnpm i\nEOF\nls'), [['cat'], ['ls']]);
  assert.deepEqual(splitCommands('x # npm i; y'), [['x']]);
  assert.deepEqual(splitCommands('C:\\nodejs\\npm.cmd i'), [['C:\\nodejs\\npm.cmd', 'i']]);
});

test('install commands are blocked even when the deny rules would miss them', () => {
  for (const [command, expected] of Object.entries(BLOCKED)) assert.equal(findInstall(command), expected, command);
});

test('read-only npm commands and text that only mentions installs are allowed', () => {
  for (const command of ALLOWED) assert.equal(findInstall(command), null, command);
});

test('the hook blocks with exit code 2 and lets other commands run', () => {
  const run = (input) => spawnSync(process.execPath, [path.join(root, HOOK)], { input, encoding: 'utf8' });
  const event = (tool_name, command) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name, tool_input: { command } });
  const blocked = run(event('Bash', 'npm --silent install'));
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /npm install/);
  assert.equal(run(event('PowerShell', 'sh -c "npm i x"')).status, 2);
  assert.equal(run(event('Bash', 'npm run check')).status, 0);
  assert.equal(run(event('PowerShell', 'npm ls')).status, 0);
  assert.equal(run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } })).status, 0);
  assert.equal(run('not json').status, 2, 'unreadable input fails closed');
});

test('Claude Code runs the hook for Bash and PowerShell and blocks when it cannot run', () => {
  const settings = JSON.parse(read('templates/common/.claude/settings.json.tmpl'));
  const [entry] = settings.hooks.PreToolUse;
  assert.equal(entry.matcher, 'Bash|PowerShell');
  assert.deepEqual(entry.hooks, [
    { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/block-package-installs.mjs'], timeout: 10, onFailure: 'block' },
  ]);
  assert.equal(read('.claude/hooks/block-package-installs.mjs'), read(HOOK), 'the central repository uses the same hook it syncs');
});

// Codex reads .codex/hooks.json (#180). Its loader rejects unknown fields, so only these keys appear.
const CODEX_HOOKS = 'templates/common/.codex/hooks.json.tmpl';

test('Codex runs the same hook for shell commands from .codex/hooks.json', () => {
  const config = JSON.parse(read(CODEX_HOOKS));
  assert.deepEqual(Object.keys(config), ['hooks']);
  assert.deepEqual(Object.keys(config.hooks), ['PreToolUse']);
  const [entry, ...rest] = config.hooks.PreToolUse;
  assert.equal(rest.length, 0);
  assert.equal(entry.matcher, 'Bash', 'Codex reports every shell command as Bash, also on Windows');
  assert.equal(entry.hooks.length, 1);
  const [hook] = entry.hooks;
  assert.deepEqual(Object.keys(hook).sort(), ['command', 'statusMessage', 'timeout', 'type']);
  assert.equal(hook.type, 'command');
  assert.equal(hook.timeout, 10);
  assert.match(hook.command, /\/\.claude\/hooks\/block-package-installs\.mjs/);
  // One command string for sh -lc and cmd /C: no characters either shell would expand inside the quotes.
  assert.doesNotMatch(hook.command.replace(/^node --input-type=commonjs -e "|"$/g, ''), /["$`\\%^]/);
  assert.equal(read('.codex/hooks.json'), read(CODEX_HOOKS), 'the central repository uses the same Codex hook it syncs');
});

test('the Codex hook command blocks installs from the repository root and from a subfolder', () => {
  const { command } = JSON.parse(read(CODEX_HOOKS)).hooks.PreToolUse[0].hooks[0];
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}` };
  // Same as Codex's command runner: `%COMSPEC% /C "<command>"` (raw) on Windows, `$SHELL -lc <command>` elsewhere.
  const run = (cwd, shellCommand) => {
    const input = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd, tool_input: { command: shellCommand } });
    return process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? process.env.COMSPEC ?? 'cmd.exe', ['/C', `"${command}"`], { cwd, env, input, encoding: 'utf8', windowsVerbatimArguments: true })
      : spawnSync(process.env.SHELL || '/bin/sh', ['-lc', command], { cwd, env, input, encoding: 'utf8' });
  };
  for (const cwd of [root, path.join(root, 'scripts', 'test')]) {
    const blocked = run(cwd, 'npm --silent install');
    assert.equal(blocked.status, 2, blocked.stderr);
    assert.match(blocked.stderr, /npm install/);
    assert.equal(run(cwd, '& "C:\\Program Files\\nodejs\\npm.cmd" update').status, 2);
    assert.equal(run(cwd, 'npm ci').status, 0);
    const allowed = run(cwd, 'npm ls');
    assert.equal(allowed.status, 0, allowed.stderr);
  }
});
