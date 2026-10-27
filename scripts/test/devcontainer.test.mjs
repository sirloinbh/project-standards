// Dev Container template (#282): features.devcontainer apps get .devcontainer/ with a pinned Node
// image that runs next to the app's own db service.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const target = data.sync.targets.find((t) => t.project === 'workout-memo');
const project = data.projects.projects.find((p) => p.name === 'workout-memo');
const files = Object.fromEntries(
  renderProfile({ root, profile: 'app', folders: ['devcontainer'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) }).map((f) => [f.path, f.content]),
);
const config = JSON.parse(files['.devcontainer/devcontainer.json']);
const compose = files['.devcontainer/compose.yaml'];

test('only apps with features.devcontainer receive .devcontainer/', () => {
  for (const t of data.sync.targets.filter((x) => x.profile === 'app')) {
    const p = data.projects.projects.find((x) => x.name === t.project);
    const paths = planTarget({ root, data, target: t, centralSha: 'abcdef1234567', readExisting: () => null }).files.map((f) => f.path);
    assert.equal(paths.includes('.devcontainer/devcontainer.json'), p.features.devcontainer, t.repo);
    assert.equal(paths.includes('.devcontainer/compose.yaml'), p.features.devcontainer, t.repo);
  }
});

test('the container uses the app compose db, registry ports and the workspace folder', () => {
  assert.deepEqual(config.dockerComposeFile, ['../compose.yaml', 'compose.yaml']);
  assert.deepEqual(config.runServices, ['db', 'dev']);
  assert.equal(config.service, 'dev');
  assert.equal(config.workspaceFolder, `/workspaces/${project.repos.umbrella}`);
  assert.deepEqual(config.forwardPorts, [project.ports.vite, project.ports.api]);
  assert.match(compose, new RegExp(`- \\.\\.:/workspaces/${project.repos.umbrella}:cached`));
  assert.match(compose, /@db:5432\/\$\{POSTGRES_DB:-workout\}/);
});

test('the Node image is pinned by digest and matches the Node version of versions.json', () => {
  const image = data.versions.images.devcontainerNode;
  assert.match(image, /^node:[\d.]+-bookworm@sha256:[0-9a-f]{64}$/);
  assert.ok(image.startsWith(`node:${data.versions.node}-`), 'same Node version as versions.json node');
  assert.match(compose, new RegExp(`^ {4}image: ${image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
});

test('nothing installs packages automatically', () => {
  for (const key of ['postCreateCommand', 'postStartCommand', 'postAttachCommand', 'updateContentCommand', 'onCreateCommand', 'features']) assert.ok(!(key in config), key);
  const active = compose.split('\n').filter((l) => !l.trimStart().startsWith('#'));
  assert.ok(!active.some((l) => /\bnpm\b|\bnpx\b/.test(l)), 'no npm in the service definition');
  assert.match(compose, /^# {3}npm ci --ignore-scripts$/m, 'the manual steps keep --ignore-scripts');
});

const hasDocker = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' }).status === 0;
test('docker compose merges the container with an app compose.yaml', { skip: !hasDocker && 'docker compose not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devcontainer-'));
  try {
    fs.mkdirSync(path.join(dir, '.devcontainer'));
    fs.writeFileSync(path.join(dir, '.devcontainer/compose.yaml'), compose);
    fs.writeFileSync(
      path.join(dir, 'compose.yaml'),
      [
        'services:',
        '  db:',
        '    image: postgres:17-alpine',
        '    environment: { POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}" }',
        "    healthcheck: { test: ['CMD-SHELL', 'pg_isready'] }",
        '',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(dir, '.env'), 'POSTGRES_PASSWORD=dev-only\n');
    const r = spawnSync('docker', ['compose', '-f', 'compose.yaml', '-f', '.devcontainer/compose.yaml', 'config', '--format', 'json'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const merged = JSON.parse(r.stdout);
    assert.equal(merged.services.dev.environment.DATABASE_URL, 'postgres://workout:dev-only@db:5432/workout');
    assert.equal(merged.services.dev.depends_on.db.condition, 'service_healthy');
    assert.ok(merged.services.dev.volumes.some((v) => v.target === `/workspaces/${project.repos.umbrella}`));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
