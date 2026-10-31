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
const GIT_RULES = 'templates/common/.codex/rules/git-branch.rules';
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

const permissions = JSON.parse(read(TEMPLATE)).permissions;
const isGitRule = (rule) => /^\w+\(git /.test(rule);
const deny = permissions.deny.filter((rule) => !isGitRule(rule));
const commands = (tool) => deny.filter((r) => r.startsWith(`${tool}(`)).map((r) => r.slice(tool.length + 1, -3));

test('the central repository uses the same files it syncs', () => {
  assert.equal(read('.claude/settings.json'), read(TEMPLATE));
  assert.equal(read('.codex/rules/package-installs.rules'), read(RULES));
  assert.equal(read('.codex/rules/git-branch.rules'), read(GIT_RULES));
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

// Claude Code decides deny first, then ask, then allow; * matches any text (#361).
const matches = (rule, tool, command) => {
  const open = `${tool}(`;
  if (!rule.startsWith(open)) return false;
  const pattern = rule.slice(open.length, -1).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  // PowerShell rules ignore case, so -d also matches -D there.
  return new RegExp(`^${pattern}$`, tool === 'PowerShell' ? 'i' : '').test(command);
};
const decide = (tool, command) => {
  for (const decision of ['deny', 'ask', 'allow']) {
    if ((permissions[decision] ?? []).some((rule) => matches(rule, tool, command))) return decision;
  }
  return 'none';
};

test('Claude Code runs the git branch commands without asking and keeps the dangerous forms out (#361)', () => {
  const expected = {
    allow: ['git switch main', 'git switch feat/1-force-x', 'git switch --create feat/1-x origin/main', 'git pull --ff-only', 'git branch --delete feat/1-x', 'git branch --delete docs/1-fix-x', 'git fetch origin', 'git fetch --prune origin'],
    ask: ['git switch -f main', 'git switch main -f', 'git switch --force main', 'git switch --discard-changes main', 'git switch -C x origin/main', 'git switch --force-create x',
      'git branch -D feat/1-x', 'git branch --delete -f feat/1-x', 'git branch --delete --force feat/1-x', 'git reset --hard', 'git reset --hard origin/main', 'git clean -fd', 'git stash', 'git stash pop', 'git rebase main'],
    deny: ['git push --force origin x', 'git push -f origin x', 'git push origin x --force', 'git push origin x -f', 'git push --force-with-lease origin x', 'git push origin +x',
      'git push origin main', 'git push origin HEAD:main', 'git push origin x:main'],
    none: ['git pull', 'git pull origin main', 'git fetch https://example.com/x.git', 'git push origin feat/1-x'],
  };
  for (const tool of ['Bash', 'PowerShell']) {
    for (const [decision, list] of Object.entries(expected)) {
      for (const command of list) assert.equal(decide(tool, command), decision, `${tool} ${command}`);
    }
  }
});

test('PowerShell treats the short -c and -d like -C and -D, so the rules use --create and --delete (#361)', () => {
  assert.equal(decide('PowerShell', 'git switch -c feat/1-x origin/main'), 'ask');
  assert.equal(decide('PowerShell', 'git branch -d feat/1-x'), 'ask');
  assert.equal(decide('Bash', 'git switch -c feat/1-x origin/main'), 'allow');
  assert.equal(decide('Bash', 'git branch -d feat/1-x'), 'none');
});

test('the git rules are the same for Bash and PowerShell (#361)', () => {
  for (const decision of ['allow', 'ask', 'deny']) {
    const of = (tool) => permissions[decision].filter((r) => r.startsWith(`${tool}(git `)).map((r) => r.slice(tool.length));
    assert.ok(of('Bash').length > 0, decision);
    assert.deepEqual(of('PowerShell'), of('Bash'), decision);
  }
});

test('the Codex git rules allow, prompt, and forbid the same kinds of commands (#361)', () => {
  const rules = read(GIT_RULES);
  assert.equal((rules.match(/decision = "allow"/g) ?? []).length, 4);
  assert.equal((rules.match(/decision = "prompt"/g) ?? []).length, 5);
  assert.equal((rules.match(/decision = "forbidden"/g) ?? []).length, 2);
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
