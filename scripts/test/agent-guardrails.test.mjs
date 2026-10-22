import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { npmCommand } from '../../templates/common/.claude/hooks/block-package-installs.mjs';

// The npm install block for agents (#16, docs/agent-guardrails.md): Claude Code deny rules and Codex rules.
const root = path.join(import.meta.dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const TEMPLATE = 'templates/common/.claude/settings.json.tmpl';
const RULES = 'templates/common/.codex/rules/package-installs.rules';
const REQUIRED = ['npm install', 'npm i', 'npm in', 'npm ins', 'npm inst', 'npm insta', 'npm instal', 'npm isnt', 'npm isnta', 'npm isntal', 'npm isntall', 'npm udpate', 'npm link', 'npm ln', 'npm add', 'npm ci', 'npm update', 'npm uninstall', 'npm remove', 'npm rm', 'npm exec', 'npx', 'pnpm', 'yarn', 'bun', 'corepack',
  // npm 11 aliases added in #178 (lib/utils/cmd-list.js).
  'npm u', 'npm ic', 'npm install-clean', 'npm isntall-clean', 'npm clean-install-test', 'npm sit', 'npm rb', 'npm ddp', 'npm unlink', 'npm innit'];
// npm commands that install, remove, or run packages, as the hook resolves them (`audit` only with `fix`).
const NPM_BLOCKED = new Set(['install', 'ci', 'install-test', 'install-ci-test', 'update', 'uninstall', 'exec', 'init', 'rebuild', 'dedupe', 'link']);
// Every prefix of a word, each `-x` also written as camelCase `X`: the forms npm resolves (#178).
const prefixForms = (word) => {
  const camel = (w) => {
    const i = w.search(/-[a-z]/);
    if (i < 0) return [w];
    return camel(w.slice(i + 2)).flatMap((rest) => [w.slice(0, i + 2) + rest, w.slice(0, i) + w[i + 1].toUpperCase() + rest]);
  };
  return Array.from(word, (_, i) => word.slice(0, i + 1)).flatMap(camel);
};

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
  assert.equal((rules.match(/decision = "forbidden"/g) ?? []).length, 4);
});

test('Codex also forbids every prefix and camelCase form npm resolves to an install command', () => {
  const rules = read(RULES);
  const npm = JSON.parse(rules.match(/pattern = \["npm", (\[[^\]]+\])\]/)[1]);
  const forms = JSON.parse(rules.match(/pattern = \["npm", \[\n([^\]]+)\]\]/)[1].replace(/,\s*$/, '').replace(/^/, '[') + ']');
  for (const word of npm) assert.ok(NPM_BLOCKED.has(npmCommand(word)), word);
  for (const word of forms) {
    assert.ok(NPM_BLOCKED.has(npmCommand(word)), word);
    assert.ok(!npm.includes(word), `${word} is listed twice`);
  }
  const listed = new Set([...npm, ...forms]);
  const missing = [...listed].flatMap(prefixForms).filter((w) => NPM_BLOCKED.has(npmCommand(w)) && !listed.has(w));
  assert.deepEqual([...new Set(missing)], [], 'every form npm accepts is listed');
});

// Runs only where the Codex CLI is installed (not in CI): the real parser judges sample commands.
const codex = spawnSync('codex', ['--version'], { shell: process.platform === 'win32', encoding: 'utf8' });
test('the Codex CLI forbids installs and allows npm run', { skip: codex.status !== 0 && 'codex CLI not installed' }, () => {
  const check = (...cmd) =>
    JSON.parse(spawnSync('codex', ['execpolicy', 'check', '--rules', path.join(root, RULES), '--', ...cmd], { shell: process.platform === 'win32', encoding: 'utf8' }).stdout);
  const forbidden = [['npm', 'install'], ['npm', 'i', 'react'], ['npx', 'shadcn'], ['yarn'], ['npm', 'audit', 'fix'],
    ['npm', 'u'], ['npm', 'ic'], ['npm', 'sit'], ['npm', 'rb'], ['npm', 'ddp'], ['npm', 'unlink'], ['npm', 'innit'], ['npm', 'upd'], ['npm', 'installTest']];
  for (const cmd of forbidden) assert.equal(check(...cmd).decision, 'forbidden', cmd.join(' '));
  for (const cmd of [['npm', 'run', 'check'], ['npm', 'ls'], ['npm', 'audit'], ['npm', 'test']]) assert.deepEqual(check(...cmd).matchedRules, [], cmd.join(' '));
});
