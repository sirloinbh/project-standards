// Checks Claude Code's real permission decisions for the git branch rules on this PC (#361, #365).
// A short Claude session tries each command with the PowerShell and Bash tools. Every permission
// prompt is answered "deny", so a command that asks never runs. Uses a small amount of model quota.
// Usage, from a repository on a clean main: node <project-standards>/tools/check-git-permissions.mjs
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const cwd = process.cwd();
const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

// `git switch main` and `git reset --hard` must be harmless if a rule turns out to be wrong.
if (git('symbolic-ref', '--short', 'HEAD') !== 'main' || git('status', '--porcelain', '--untracked-files=no') !== '') {
  console.error('Run this on a clean main: it tries git switch main and git reset --hard.');
  process.exit(2);
}

const branch = 'zz-permission-check-does-not-exist';
const expected = new Map([
  ['git switch main', 'RAN'],
  ['git pull --ff-only', 'RAN'],
  [`git branch --delete ${branch}`, 'RAN'],
  ['git fetch origin', 'RAN'],
  ['git fetch --prune origin', 'RAN'],
  [`git branch -D ${branch}`, 'ASKED'],
  [`git branch --delete --force ${branch}`, 'ASKED'],
  ['git reset --hard', 'ASKED'],
  ['git stash list', 'ASKED'],
  [`git push --force origin ${branch}`, 'BLOCKED'],
  ['git push origin main', 'BLOCKED'],
]);
const tools = process.platform === 'win32' ? ['PowerShell', 'Bash'] : ['Bash'];
const prompt = `This is a permission test. For each command below, in order, make exactly one tool call with the exact command text, once with each of these tools: ${tools.join(', ')}. Run them one at a time. Never change, wrap, or retry a command. A denial or failure is an expected result: continue with the next one. When finished, reply DONE.\n\n${[...expected.keys()].join('\n')}`;

// All arguments are fixed strings. The shell only lets Windows find claude.exe or claude.cmd.
const args = ['-p', '--model', 'haiku', '--permission-mode', 'default', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio'];
const child = spawn('claude', args, { cwd, stdio: ['pipe', 'pipe', 'inherit'], shell: process.platform === 'win32' });
child.stdin.write(`${JSON.stringify({ type: 'user', message: { role: 'user', content: prompt } })}\n`);
const timer = setTimeout(() => child.kill(), 400000);

const uses = new Map();
const asked = new Set();
const results = new Map();
for await (const line of createInterface({ input: child.stdout })) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    continue;
  }
  if (message.type === 'control_request' && message.request?.subtype === 'can_use_tool') {
    asked.add(`${message.request.tool_name}:${message.request.input?.command}`);
    child.stdin.write(`${JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: message.request_id, response: { behavior: 'deny', message: 'permission check: prompt reached' } } })}\n`);
  }
  if (message.type === 'assistant') {
    for (const block of message.message.content) if (block.type === 'tool_use') uses.set(block.id, `${block.name}:${block.input?.command}`);
  }
  if (message.type === 'user' && Array.isArray(message.message?.content)) {
    for (const block of message.message.content) {
      if (block.type !== 'tool_result' || !uses.has(block.tool_use_id)) continue;
      const key = uses.get(block.tool_use_id);
      const text = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
      results.set(key, asked.has(key) ? 'ASKED' : block.is_error && /has been denied/i.test(text) ? 'BLOCKED' : 'RAN');
    }
  }
  if (message.type === 'result') break;
}
clearTimeout(timer);
child.kill();

let failed = 0;
for (const [command, want] of expected) {
  for (const name of tools) {
    const got = results.get(`${name}:${command}`) ?? 'NOT TRIED';
    if (got !== want) failed += 1;
    console.log(`${got === want ? 'ok  ' : 'FAIL'}  ${got.padEnd(9)} ${name.padEnd(10)} ${command}${got === want ? '' : `  (expected ${want})`}`);
  }
}
console.log(failed === 0 ? 'All decisions match.' : `${failed} decisions differ. If the RAN ones show ASKED, open Claude Code here once and accept the folder trust prompt.`);
process.exit(failed === 0 ? 0 : 1);
