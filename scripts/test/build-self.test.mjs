import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSelf, checkSelf, writeSelf } from '../build-self.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('the committed copies of this repo are current', () => {
  assert.deepEqual(checkSelf(root), []);
});

test('skips templated skills and copies hooks unchanged', () => {
  const { out } = buildSelf(root);
  assert.ok(out.has('.claude/skills/std-git-writing/SKILL.md'));
  assert.ok(![...out.keys()].some((f) => f.startsWith('.claude/skills/std-implementation/')));
  assert.deepEqual(out.get('.claude/hooks/block-package-installs.mjs'), fs.readFileSync(path.join(root, 'templates/common/.claude/hooks/block-package-installs.mjs')));
});

test('check reports stale, missing, and unexpected files, and write fixes them', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'self-'));
  try {
    fs.cpSync(path.join(root, 'templates/common'), path.join(tmp, 'templates/common'), { recursive: true });
    writeSelf(tmp);
    assert.deepEqual(checkSelf(tmp), []);
    fs.appendFileSync(path.join(tmp, '.claude/hooks/pc-setup-notice.mjs'), '// edit\n');
    fs.rmSync(path.join(tmp, '.codex/hooks.json'));
    fs.writeFileSync(path.join(tmp, '.claude/skills/extra.md'), 'x');
    assert.deepEqual(checkSelf(tmp).sort(), ['missing: .codex/hooks.json', 'stale: .claude/hooks/pc-setup-notice.mjs', 'unexpected: .claude/skills/extra.md']);
    writeSelf(tmp);
    assert.deepEqual(checkSelf(tmp), []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
