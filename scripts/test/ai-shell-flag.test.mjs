// features.aiShell (#612, ADR-0017): the AI shell button is off in every app until shared-ai serves /api/chat.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);

test('each ui app gets its own AI_SHELL value, off by default', () => {
  const uiApps = data.projects.projects.filter((p) => p.features.ui);
  assert.ok(uiApps.length > 0);
  for (const project of uiApps) {
    const target = data.sync.targets.find((t) => t.project === project.name);
    const files = planTarget({ root, data, target, centralSha: 'a'.repeat(40) }).files;
    const file = files.find((f) => f.path === 'frontend/src/lib/ai-config.ts');
    assert.ok(file, `${project.name} receives ai-config.ts`);
    assert.ok(file.content.includes(`export const AI_SHELL: boolean = ${project.features.aiShell};\n`), project.name);
  }
});
