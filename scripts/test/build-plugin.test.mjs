import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MARKETPLACE_FILE, PLUGIN_DIR, buildPlugin, checkPlugin, rewriteHooks, writePlugin } from '../build-plugin.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = buildPlugin(root);
const text = (f) => out.get(f).toString();

test('copies the std skills without template variables and skips the templated ones', () => {
  assert.ok(out.has(`${PLUGIN_DIR}/skills/std-git-writing/SKILL.md`));
  assert.ok(!out.has(`${PLUGIN_DIR}/skills/std-implementation/SKILL.md`));
  for (const [f, content] of out) if (f.includes('/skills/')) assert.ok(!content.toString().includes('{{'), f);
  assert.match(text(`${PLUGIN_DIR}/README.md`), /## Skipped skills[\s\S]*`std-implementation`/);
});

test('copies the hook scripts unchanged', () => {
  for (const f of ['block-package-installs.mjs', 'block-forbidden-commands.mjs', 'pc-setup-notice.mjs']) {
    assert.deepEqual(out.get(`${PLUGIN_DIR}/hooks/${f}`), fs.readFileSync(path.join(root, 'templates/common/.claude/hooks', f)));
  }
});

test('rewrites hook paths to the plugin root', () => {
  const raw = text(`${PLUGIN_DIR}/hooks/hooks.json`);
  assert.ok(!raw.includes('CLAUDE_PROJECT_DIR'));
  const hooks = JSON.parse(raw).hooks;
  assert.ok(hooks.PreToolUse && hooks.SessionStart);
  const args = Object.values(hooks).flatMap((groups) => groups.flatMap((g) => g.hooks.flatMap((h) => h.args)));
  assert.ok(args.length >= 4);
  for (const a of args) assert.match(a, /^\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[\w-]+\.mjs$/);
  assert.deepEqual(rewriteHooks({ a: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/x.mjs'] }), { a: ['${CLAUDE_PLUGIN_ROOT}/hooks/x.mjs'] });
});

test('plugin manifest and marketplace are valid and list the plugin', () => {
  const plugin = JSON.parse(text(`${PLUGIN_DIR}/.claude-plugin/plugin.json`));
  assert.match(plugin.name, /^[a-z][a-z0-9-]*$/);
  const market = JSON.parse(text(MARKETPLACE_FILE));
  assert.equal(market.name, 'sirloinbh-standards');
  assert.equal(market.owner.name, 'sirloinbh');
  assert.deepEqual(
    market.plugins.map((p) => [p.name, p.source]),
    [[plugin.name, `./${PLUGIN_DIR}`]],
  );
  assert.ok(fs.existsSync(path.join(root, market.plugins[0].source, '.claude-plugin/plugin.json')));
});

test('the committed plugin is up to date', () => {
  assert.deepEqual(checkPlugin(root), []);
});

test('check reports stale, missing, and unexpected files; write repairs them', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
  try {
    for (const d of ['templates/common/skills', 'templates/common/.claude/hooks']) fs.cpSync(path.join(root, d), path.join(tmp, d), { recursive: true });
    fs.copyFileSync(path.join(root, 'templates/common/.claude/settings.json.tmpl'), path.join(tmp, 'templates/common/.claude/settings.json.tmpl'));
    writePlugin(tmp);
    assert.deepEqual(checkPlugin(tmp), []);
    fs.appendFileSync(path.join(tmp, PLUGIN_DIR, 'skills/std-backlog/SKILL.md'), 'x');
    fs.rmSync(path.join(tmp, MARKETPLACE_FILE));
    fs.writeFileSync(path.join(tmp, PLUGIN_DIR, 'extra.txt'), 'x');
    assert.deepEqual(checkPlugin(tmp).sort(), [
      `missing: ${MARKETPLACE_FILE}`,
      `stale: ${PLUGIN_DIR}/skills/std-backlog/SKILL.md`,
      `unexpected: ${PLUGIN_DIR}/extra.txt`,
    ]);
    writePlugin(tmp);
    assert.deepEqual(checkPlugin(tmp), []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
