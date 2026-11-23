import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const settings = JSON.parse(fs.readFileSync(path.join(root, 'templates/common/.claude/settings.json.tmpl'), 'utf8'));
const { allow, deny } = settings.permissions;

// #1063: a session in the default mode runs an issue cycle without a prompt, while the deny list and the hooks stay.
test('the managed settings allow the tools an issue cycle uses without a prompt', () => {
  for (const tool of ['Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'SendMessage', 'ListAgents']) assert.ok(allow.includes(tool), tool);
});

test('bypassPermissions is not set in the managed settings: Claude Code ignores it in project settings', () => {
  assert.equal(settings.permissions.defaultMode, undefined);
});

test('the deny list still blocks force push, push to main, package commands and removing the root or home folder', () => {
  for (const rule of [
    'Bash(git push -f *)', 'Bash(git push *--force*)', 'Bash(git push origin main)', 'Bash(git push origin HEAD:main)',
    'PowerShell(git push *--force*)', 'PowerShell(git push origin main)',
    'Bash(rm -rf /)', 'Bash(rm -rf ~)', 'Bash(rm -rf /*)', 'Bash(rm -rf ~/*)',
    'Bash(npx *)', 'Bash(npm update *)', 'Bash(npm exec *)',
  ]) assert.ok(deny.includes(rule), rule);
});

test('deny rules take priority over the broad allow rules in Claude Code, and no allow rule repeats a deny rule', () => {
  for (const rule of allow) assert.ok(!deny.includes(rule), `${rule} is both allowed and denied`);
});

test('the guard hooks stay registered for shell and file-edit tools', () => {
  const matchers = settings.hooks.PreToolUse.map((e) => e.matcher);
  assert.deepEqual(matchers, ['Bash|PowerShell', 'Edit|Write|NotebookEdit|MultiEdit']);
  const shellHooks = settings.hooks.PreToolUse[0].hooks.map((h) => path.basename(h.args[0]));
  assert.deepEqual(shellHooks, ['block-package-installs.mjs', 'block-forbidden-commands.mjs']);
});

test('this repo uses the same settings as the template', () => {
  assert.equal(fs.readFileSync(path.join(root, '.claude/settings.json'), 'utf8'), fs.readFileSync(path.join(root, 'templates/common/.claude/settings.json.tmpl'), 'utf8'));
});
