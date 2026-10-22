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
  "bash -lc 'npm ci'": 'npm ci',
  '"C:\\Program Files\\nodejs\\npm.cmd" install': 'npm install',
  '& "C:\\Program Files\\nodejs\\npm.cmd" ci': 'npm ci',
  'C:\\nodejs\\NPM.CMD i react': 'npm install',
  '/c/Program\\ Files/Volta/npm install': 'npm install',
  // Options with values, aliases and abbreviations npm accepts.
  'npm --prefix frontend install': 'npm install',
  'npm -w app install': 'npm install',
  'npm --loglevel=silent add react': 'npm install',
  'npm u': 'npm update',
  'npm upd': 'npm update',
  'npm ic': 'npm ci',
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
  'powershell.exe -c npm ci': 'npm ci',
  [`pwsh -EncodedCommand ${Buffer.from('npm install', 'utf16le').toString('base64')}`]: 'npm install',
  'Invoke-Expression "npm i x"': 'npm install',
  "iex 'npm ci'": 'npm ci',
  'eval "npm i"': 'npm install',
  'Start-Process npm -ArgumentList "install","x" -Wait': 'npm install',
  'Start-Process -FilePath npm.cmd -ArgumentList "ci"': 'npm ci',
  'Get-ChildItem | ForEach-Object { npm i $_.Name }': 'npm install',
  'node C:/nodejs/node_modules/npm/bin/npm-cli.js i': 'npm install',
  'volta run npm install': 'npm install',
  'pnpm add x': 'pnpm',
  'bunx x': 'bunx',
  'corepack enable': 'corepack',
  'cd frontend\nnpm ci': 'npm ci',
};

const ALLOWED = [
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
