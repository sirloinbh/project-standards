// The SessionStart hook that tells a PC its global instructions still hold the Fork rule (#368).
// Every run uses a temporary home folder; the real global instructions are never read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const HOOK = join(root, 'templates/common/.claude/hooks/pc-setup-notice.mjs');

function run(files) {
  const home = mkdtempSync(join(tmpdir(), 'pc-notice-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(home, name, '..'), { recursive: true });
      writeFileSync(join(home, name), content);
    }
    return spawnSync(process.execPath, [HOOK], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test('a Fork section in the global instructions produces a notice shown to the user and the agent', () => {
  const r = run({ '.claude/CLAUDE.md': '# 지침\n\n## 로컬 브랜치는 Fork 앱으로 관리\n\n- 옛 규칙\n', '.codex/AGENTS.md': '## 로컬 브랜치는 git CLI로 관리\n' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.match(out.systemMessage, /~\/\.claude\/CLAUDE\.md/);
  assert.doesNotMatch(out.systemMessage, /AGENTS\.md/);
  assert.match(out.systemMessage, /tools\\install\.ps1/);
  assert.match(out.systemMessage, /check-git-permissions\.mjs/);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /사용자에게 이 내용을 알리고/);
});

test('nothing is printed when the rule is applied, the files are missing, or Fork is only mentioned in text', () => {
  for (const files of [{ '.claude/CLAUDE.md': '## 로컬 브랜치는 git CLI로 관리\n' }, {}, { '.claude/CLAUDE.md': '## 다른 절\n\nFork 앱은 쓰지 않는다.\n' }]) {
    const r = run(files);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  }
});

test('the hook is registered without blocking a session, in the template and the central copy', () => {
  for (const file of ['templates/common/.claude/settings.json.tmpl', '.claude/settings.json']) {
    const { hooks } = JSON.parse(readFileSync(join(root, file), 'utf8'));
    assert.deepEqual(hooks.SessionStart, [{ hooks: [{ type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/pc-setup-notice.mjs'], timeout: 10 }] }]);
  }
  assert.equal(readFileSync(join(root, '.claude/hooks/pc-setup-notice.mjs'), 'utf8'), readFileSync(HOOK, 'utf8'));
});
