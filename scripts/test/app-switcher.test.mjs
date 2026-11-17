// The app switcher list (#561): lib/apps.ts is rendered from the registry for every ui app.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll, serviceHost } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';
import { appsList } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const uiApps = data.projects.projects.filter((p) => p.features.ui);

test('each ui app gets all active apps with their addresses and its own name', () => {
  assert.ok(uiApps.length > 0);
  for (const project of uiApps) {
    const target = data.sync.targets.find((t) => t.project === project.name);
    const file = planTarget({ root, data, target, centralSha: 'a'.repeat(40) }).files.find((f) => f.path === 'frontend/src/lib/apps.ts');
    assert.ok(file, `${project.name} receives apps.ts`);
    assert.ok(file.content.includes(`export const CURRENT_APP: string = '${project.name}';`), project.name);
    for (const p of data.projects.projects.filter((x) => x.status === 'active')) {
      assert.ok(file.content.includes(`href: 'https://${serviceHost(p, data.platform)}/'`), `${project.name} lists ${p.name}`);
    }
    assert.doesNotMatch(file.content, /\{\{/);
  }
});

test('the list is empty while there is no root domain, and names with quotes are escaped', () => {
  const noDomain = { projects: data.projects, platform: { ...data.platform, rootDomain: null } };
  assert.equal(appsList(noDomain), '');
  const quoted = { projects: { projects: [{ ...data.projects.projects[0], displayName: "Tom's \\ app" }] }, platform: data.platform };
  assert.ok(appsList(quoted).includes("label: 'Tom\\'s \\\\ app'"));
});
