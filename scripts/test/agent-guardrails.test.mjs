import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// The npm install block for agents (#16, docs/agent-guardrails.md): Claude Code deny rules and Codex rules.
const root = path.join(import.meta.dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const TEMPLATE = 'templates/common/.claude/settings.json.tmpl';
const RULES = 'templates/common/.codex/rules/package-installs.rules';
const REQUIRED = ['npm install', 'npm i', 'npm add', 'npm ci', 'npm update', 'npm uninstall', 'npm remove', 'npm rm', 'npm exec', 'npx', 'pnpm', 'yarn', 'bun', 'corepack'];

const deny = JSON.parse(read(TEMPLATE)).permissions.deny;
const commands = (tool) => deny.filter((r) => r.startsWith(`${tool}(`)).map((r) => r.slice(tool.length + 1, -3));

test('the central repository uses the same files it syncs', () => {
  assert.equal(read('.claude/settings.json'), read(TEMPLATE));
  assert.equal(read('.codex/rules/package-installs.rules'), read(RULES));
});

test('Claude Code denies every install command in both Bash and PowerShell', () => {
  for (const rule of deny) assert.match(rule, /^(Bash|PowerShell)\([a-z][a-z -]*[a-z] \*\)$/, rule);
  assert.deepEqual(commands('PowerShell'), commands('Bash'));
  for (const command of REQUIRED) assert.ok(commands('Bash').includes(command), command);
  assert.ok(!commands('Bash').some((c) => /^npm (run|ls|view|outdated|audit)$/.test(c)), 'read-only npm commands stay allowed');
});

test('Codex forbids the same npm subcommands and package managers', () => {
  const rules = read(RULES);
  const npm = commands('Bash').filter((c) => c.startsWith('npm ') && c !== 'npm audit fix').map((c) => c.slice(4));
  const listed = JSON.parse(rules.match(/pattern = \["npm", (\[[^\]]+\])\]/)[1]);
  assert.deepEqual(listed, npm);
  assert.match(rules, /pattern = \["npm", "audit", "fix"\]/);
  const others = JSON.parse(rules.match(/pattern = \[(\["npx"[^\]]*\])\]/)[1]);
  assert.deepEqual(others, commands('Bash').filter((c) => !c.startsWith('npm ')));
  assert.equal((rules.match(/decision = "forbidden"/g) ?? []).length, 3);
});

// Runs only where the Codex CLI is installed (not in CI): the real parser judges sample commands.
const codex = spawnSync('codex', ['--version'], { shell: process.platform === 'win32', encoding: 'utf8' });
test('the Codex CLI forbids installs and allows npm run', { skip: codex.status !== 0 && 'codex CLI not installed' }, () => {
  const check = (...cmd) =>
    JSON.parse(spawnSync('codex', ['execpolicy', 'check', '--rules', path.join(root, RULES), '--', ...cmd], { shell: process.platform === 'win32', encoding: 'utf8' }).stdout);
  for (const cmd of [['npm', 'install'], ['npm', 'i', 'react'], ['npx', 'shadcn'], ['yarn'], ['npm', 'audit', 'fix']]) {
    assert.equal(check(...cmd).decision, 'forbidden', cmd.join(' '));
  }
  for (const cmd of [['npm', 'run', 'check'], ['npm', 'ls'], ['npm', 'audit']]) assert.deepEqual(check(...cmd).matchedRules, [], cmd.join(' '));
});
