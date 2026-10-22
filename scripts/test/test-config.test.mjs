// Test configuration templates (#33): playwright.config.ts (features.e2e) and frontend/vitest.config.ts (features.vitest).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { HEADER_TEXT } from '../lib/render.mjs';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const original = loadAll(root);
const appTargets = original.data.sync.targets.filter((t) => t.profile === 'app');
const render = (data, target) => renderProfile({ root, profile: 'app', folders: ['e2e', 'vitest'], vars: buildVars(data, target, { centralSha: 'a'.repeat(40) }) });
const fileOf = (files, p) => files.find((f) => f.path === p);

test('playwright.config.ts gets the e2e API and web ports of every registered app', () => {
  assert.equal(appTargets.length, 8);
  for (const target of appTargets) {
    const { ports, slot } = original.data.projects.projects.find((p) => p.name === target.project);
    const config = fileOf(render(original.data, target), 'playwright.config.ts');
    assert.equal(config.mode, 'full');
    assert.match(config.content, new RegExp(`^const apiPort = ${ports.e2eApi};$`, 'm'), target.project);
    assert.match(config.content, new RegExp(`^const webPort = ${ports.e2eWeb};$`, 'm'), target.project);
    assert.match(config.content, new RegExp(`slot ${slot},`), target.project);
    // The dev ports never appear: e2e runs beside the dev servers.
    assert.ok(!config.content.includes(String(ports.api)) && !config.content.includes(String(ports.vite)), target.project);
    assert.ok(config.content.split('\n')[0].includes(HEADER_TEXT), 'managed header on the first line');
    assert.doesNotMatch(config.content, /(?<!\$)\{\{/);
  }
});

test('the e2e servers use those ports: API health check, strict Vite port, and the proxy target', () => {
  const config = fileOf(render(original.data, appTargets.find((t) => t.project === 'workout-memo')), 'playwright.config.ts').content;
  assert.match(config, /const apiPort = 3201;/);
  assert.match(config, /const webPort = 5301;/);
  assert.ok(config.includes('url: `http://127.0.0.1:${apiPort}/api/health`'));
  assert.ok(config.includes('PORT: String(apiPort)'));
  assert.ok(config.includes('`npm run dev -w frontend -- --port ${webPort} --strictPort`'));
  assert.ok(config.includes('API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`'));
  assert.ok(config.includes('baseURL: `http://127.0.0.1:${webPort}`'));
});

test('vitest.config.ts is the same for every app: jsdom, src tests, setup file, UTC clock', () => {
  const contents = new Set(appTargets.map((t) => fileOf(render(original.data, t), 'frontend/vitest.config.ts').content));
  assert.equal(contents.size, 1);
  const [config] = contents;
  assert.match(config, /environment: 'jsdom'/);
  assert.match(config, /include: \['src\/\*\*\/\*\.test\.\{ts,tsx\}'\]/);
  assert.match(config, /setupFiles: \['\.\/src\/test\/setup\.ts'\]/);
  assert.match(config, /env: \{ TZ: 'UTC' \}/);
});

test('the configs join a sync plan only when the registry turns features.e2e / features.vitest on', () => {
  const data = structuredClone(original.data);
  const targetOf = (project) => data.sync.targets.find((t) => t.project === project);
  const testFiles = (project) =>
    planTarget({ root, data, target: targetOf(project), centralSha: 'a'.repeat(40) })
      .files.filter((f) => ['playwright.config.ts', 'frontend/vitest.config.ts'].includes(f.path))
      .map((f) => f.path)
      .sort();
  assert.deepEqual(testFiles('workout-memo'), ['frontend/vitest.config.ts', 'playwright.config.ts']);
  assert.deepEqual(testFiles('study-log'), []);
  const studyLog = data.projects.projects.find((p) => p.name === 'study-log');
  studyLog.features.vitest = true;
  assert.deepEqual(testFiles('study-log'), ['frontend/vitest.config.ts']);
  studyLog.features.e2e = true;
  const plan = planTarget({ root, data, target: targetOf('study-log'), centralSha: 'a'.repeat(40) });
  const config = fileOf(plan.files, 'playwright.config.ts');
  assert.equal(config.source, 'templates/e2e/playwright.config.ts.tmpl');
  assert.match(config.content, /const apiPort = 3202;\nconst webPort = 5302;/);
  assert.ok(plan.manifest.files['playwright.config.ts']);
});

test('the dependency list in docs/test-config.md matches the scaffold package versions', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/test-config.md'), 'utf8');
  const rows = doc
    .split('\n')
    .map((line) => line.split('|').map((c) => c.trim()))
    .filter((cells) => cells.length > 5 && /^\d+\.\d+\.\d+$/.test(cells[4]));
  assert.ok(rows.length >= 9);
  const pkg = (file) => {
    const json = JSON.parse(fs.readFileSync(path.join(root, 'scaffold/app', file), 'utf8'));
    return { ...json.dependencies, ...json.devDependencies };
  };
  const where = { 루트: pkg('package.json.tmpl'), frontend: pkg('frontend/package.json.tmpl'), backend: pkg('backend/package.json.tmpl') };
  for (const [, , place, name, version] of rows) {
    const deps = where[Object.keys(where).find((key) => place.includes(key))];
    assert.equal(deps?.[name.replace(/`/g, '')], version, `${place} ${name}`);
  }
});
