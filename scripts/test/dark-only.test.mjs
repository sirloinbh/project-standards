// features.darkOnly (#354, ADR-0011 예정): a dark-only app is dark from the first paint, has no
// mode menu and uses the dark background for its PWA colours; other apps keep the three modes.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const filesOf = (project) => {
  const target = data.sync.targets.find((t) => t.project === project);
  return planTarget({ root, data, target, centralSha: 'a'.repeat(40) }).files;
};
const content = (files, file) => {
  const found = files.find((f) => f.path === file);
  assert.ok(found, `${file} is synced`);
  return found.content;
};
const uiApps = data.projects.projects.filter((p) => p.features.ui);

test('only workout-memo is dark-only for now', () => {
  assert.deepEqual(
    data.projects.projects.filter((p) => p.features.darkOnly).map((p) => p.name),
    ['workout-memo'],
  );
});

test('each ui app gets its own value in theme-init.js and theme-config.ts', () => {
  assert.ok(uiApps.some((p) => p.features.darkOnly) && uiApps.some((p) => !p.features.darkOnly), 'both kinds are checked');
  for (const project of uiApps) {
    const files = filesOf(project.name);
    const darkOnly = project.features.darkOnly;
    assert.ok(content(files, 'frontend/public/theme-init.js').includes(`var darkOnly = ${darkOnly};\n`), project.name);
    assert.ok(content(files, 'frontend/src/lib/theme-config.ts').includes(`export const DARK_ONLY: boolean = ${darkOnly};\n`), project.name);
  }
});

test('the offline page ignores the system setting only in dark-only apps (#363)', () => {
  for (const project of uiApps) {
    const html = content(filesOf(project.name), 'frontend/public/offline.html');
    assert.ok(html.includes(project.displayName), project.name);
    assert.doesNotMatch(html, /\{\{/, project.name);
    if (project.features.darkOnly) {
      assert.match(html, /<meta name="theme-color" content="#0a0a0a" \/>/, project.name);
      assert.match(html, /color-scheme: dark; --bg: #0a0a0a; --fg: #fafafa;/, project.name);
      assert.doesNotMatch(html, /prefers-color-scheme|#ffffff|light dark/, project.name);
    } else {
      assert.match(html, /content="#ffffff" media="\(prefers-color-scheme: light\)"/, project.name);
      assert.match(html, /content="#0a0a0a" media="\(prefers-color-scheme: dark\)"/, project.name);
      assert.match(html, /color-scheme: light dark; --bg: #ffffff;/, project.name);
    }
  }
});

test('the PWA manifest uses the dark background only for dark-only apps', () => {
  for (const project of data.projects.projects) {
    const manifest = JSON.parse(content(filesOf(project.name), 'frontend/public/manifest.webmanifest'));
    const color = project.features.darkOnly ? '#0a0a0a' : '#ffffff';
    assert.equal(manifest.background_color, color, project.name);
    assert.equal(manifest.theme_color, color, project.name);
  }
});
