import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findForbiddenCommand, findForbiddenEdit, isSecretPath } from '../../templates/common/.claude/hooks/block-forbidden-commands.mjs';

// The PreToolUse hook that blocks AGENTS.md prohibitions (#450, docs/agent-guardrails.md).
const root = path.join(import.meta.dirname, '..', '..');
const HOOK = 'templates/common/.claude/hooks/block-forbidden-commands.mjs';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

// A throwaway repository on a feature branch and one on main, so `git push` without a refspec has a branch to check.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'forbidden-hook-'));
const repo = (name, branch) => {
  const dir = path.join(temp, name);
  fs.mkdirSync(dir);
  spawnSync('git', ['init', '-q', '-b', branch], { cwd: dir });
  return dir;
};
const onFeature = repo('feature', 'feat/1-x');
const onMain = repo('main', 'main');
test.after(() => fs.rmSync(temp, { recursive: true, force: true }));

const WINDOWS = { cwd: onFeature, env: {}, platform: 'win32' };
const check = (command, options = {}) => findForbiddenCommand(command, { ...WINDOWS, ...options });

const BLOCKED = {
  // Force push and push to main, including forms the permissions.deny prefixes miss.
  'git push origin main': 'push to main',
  'git push origin HEAD:main': 'push to main',
  'git push origin feat/1:refs/heads/main': 'push to main',
  'git push upstream master': 'push to master',
  'git -C ../other push origin main': 'push to main',
  'git -c core.askPass=x push origin main': 'push to main',
  'git push --force': 'force push',
  'git push -uf origin feat/1': 'force push',
  'git push --force-with-lease origin feat/1': 'force push',
  'git push origin +feat/1': 'force push',
  'git push --all origin': 'push of every branch',
  'git push --mirror': 'push of every branch',
  'sh -c "git push origin main"': 'push to main',
  "pwsh -Command 'git push origin main'": 'push to main',
  'cmd /c git push origin main': 'push to main',
  'env GIT_TRACE=1 git push origin main': 'push to main',
  'npm test && git push origin main': 'push to main',
  // Package tags are a user step: pushing one publishes the package.
  'git push origin design-tokens/v1.2.0': 'tag push',
  'git push origin refs/tags/ui/v0.3.1': 'tag push',
  'git push --tags': 'tag push',
  'git push --follow-tags origin feat/1': 'tag push',
  // Secret files.
  'git add .env': 'git add .env',
  'git add -f backend/.env.local': 'git add backend/.env.local',
  'git add infra/terraform.tfstate': 'git add infra/terraform.tfstate',
  'git add keys/app.private-key.pem': 'git add keys/app.private-key.pem',
  'git stage backup/db.dump': 'git add backup/db.dump',
  // Merging with --delete-branch, through gh or the personal wrapper.
  '& $g pr merge 12 --repo sirloinbh/x --merge --delete-branch': 'pr merge --delete-branch',
  'ghp pr merge 12 --merge -d': 'pr merge --delete-branch',
  // Remote changes through the default gh on Windows.
  'gh pr create --title x --body y': 'default gh pr create',
  'gh pr merge 12 --merge': 'default gh pr merge',
  'gh issue comment 3 --body x': 'default gh issue comment',
  'gh workflow run sync.yml': 'default gh workflow run',
  'gh api -X POST repos/a/b/issues': 'default gh api',
  'gh api repos/a/b/labels -f name=x': 'default gh api',
  "gh api graphql -f query='mutation { addStar }'": 'default gh api',
  '& "C:\\Program Files\\GitHub CLI\\gh.exe" repo delete a/b': 'default gh repo delete',
};

const ALLOWED = [
  'git push -u origin feat/1-x',
  'git push origin feat/1-x',
  'git push -u origin feat/450-forbidden-command-hook',
  'git push origin docs/12-v2-notes',
  'git push',
  'git push origin HEAD',
  'git add .env.example docs/x.md',
  'git add -A',
  'git commit -m "never git push origin main or git add .env"',
  'grep -n "git push origin main" docs/*.md',
  '& $g pr merge 12 --repo sirloinbh/x --merge',
  '& $g pr create --title x --body-file b.md',
  'gh pr view 12',
  'gh pr list --state open',
  'gh run watch 1 --exit-status',
  'gh repo clone sirloinbh/x',
  'gh api repos/a/b/pulls',
  "gh api graphql -f query='query { viewer { login } }'",
  'gh auth status',
  'GH_CONFIG_DIR=C:/Users/me/.config/gh-personal gh pr create --title x',
];

test('forbidden commands are blocked with the reason', () => {
  for (const [command, reason] of Object.entries(BLOCKED)) {
    const found = check(command);
    assert.ok(found?.startsWith(reason), `${command} -> ${found}`);
  }
});

test('ordinary commands and text that only mentions a forbidden command are allowed', () => {
  for (const command of ALLOWED) assert.equal(check(command), null, command);
});

test('a push without a refspec is blocked only while on main', () => {
  assert.equal(check('git push', { cwd: onMain })?.startsWith('push while on main'), true);
  assert.equal(check('git push origin HEAD', { cwd: onMain })?.startsWith('push to main'), true);
  assert.equal(check('git push', { cwd: onFeature }), null);
});

test('the default gh is only checked on Windows, and a personal GH_CONFIG_DIR is allowed', () => {
  assert.equal(check('gh pr create --title x', { platform: 'linux' }), null);
  assert.equal(check('gh pr create --title x', { env: { GH_CONFIG_DIR: 'C:\\Users\\me\\.config\\gh-personal' } }), null);
  assert.ok(check('gh pr create --title x', { env: { GH_CONFIG_DIR: 'C:\\Users\\me\\.config\\gh' } }));
});

test('secret paths are told apart from examples', () => {
  for (const file of ['.env', '.env.local', 'backend/.env.production', 'x.tfstate', 'x.tfstate.backup', 'key.pem', 'github-app-private-key.txt', 'db.dump']) assert.ok(isSecretPath(file), file);
  for (const file of ['.env.example', '.env.sample', 'env.md', 'docs/env-conventions.md', 'tfstate.md', 'keyboard.ts']) assert.equal(isSecretPath(file), false, file);
});

test('edits of the .claude/skills copies are blocked; sources and files outside the project are not', () => {
  const project = path.join(temp, 'project');
  assert.match(findForbiddenEdit('.claude/skills/std-backlog/SKILL.md', project), /^edit of \.claude\/skills\/std-backlog\/SKILL\.md/);
  assert.ok(findForbiddenEdit(path.join(project, '.claude', 'skills', 'a', 'SKILL.md'), project));
  assert.equal(findForbiddenEdit('skills/std-backlog/SKILL.md', project), null);
  assert.equal(findForbiddenEdit('templates/common/skills/std-backlog/SKILL.md', project), null);
  assert.equal(findForbiddenEdit('.claude/settings.local.json', project), null);
  assert.equal(findForbiddenEdit(path.join(temp, 'elsewhere', '.claude', 'skills', 'a.md'), project), null);
});

test('the hook blocks with exit code 2 and a message, and lets other calls run', () => {
  const run = (event, env = {}) => spawnSync(process.execPath, [path.join(root, HOOK)], { input: typeof event === 'string' ? event : JSON.stringify(event), encoding: 'utf8', env: { ...process.env, ...env } });
  const blocked = run({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git push origin main' }, cwd: onFeature });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /push to main: Work on a branch/);
  assert.match(blocked.stderr, /docs\/agent-guardrails\.md/);
  assert.equal(run({ tool_name: 'PowerShell', tool_input: { command: 'git add .env' }, cwd: onFeature }).status, 2);
  assert.equal(run({ tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: onFeature }).status, 0);
  const project = path.join(temp, 'project');
  assert.equal(run({ tool_name: 'Edit', tool_input: { file_path: path.join(project, '.claude/skills/a/SKILL.md') }, cwd: project }, { CLAUDE_PROJECT_DIR: project }).status, 2);
  assert.equal(run({ tool_name: 'Write', tool_input: { file_path: path.join(project, 'skills/a/SKILL.md') }, cwd: project }, { CLAUDE_PROJECT_DIR: project }).status, 0);
  assert.equal(run({ tool_name: 'Read', tool_input: { file_path: '.claude/skills/a/SKILL.md' } }).status, 0);
  assert.equal(run('not json').status, 2, 'unreadable input fails closed');
});

test('Claude Code runs the hook for shell and file-edit tools, and the central repository uses the synced copy', () => {
  const settings = JSON.parse(read('templates/common/.claude/settings.json.tmpl'));
  const hook = { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/block-forbidden-commands.mjs'], timeout: 10, onFailure: 'block' };
  const shell = settings.hooks.PreToolUse.find((e) => e.matcher === 'Bash|PowerShell');
  const edits = settings.hooks.PreToolUse.find((e) => e.matcher === 'Edit|Write|NotebookEdit|MultiEdit');
  assert.deepEqual(shell.hooks.at(-1), hook);
  assert.deepEqual(edits.hooks, [hook]);
  assert.equal(read('.claude/hooks/block-forbidden-commands.mjs'), read(HOOK));
  assert.equal(read('.claude/settings.json'), read('templates/common/.claude/settings.json.tmpl'));
});
