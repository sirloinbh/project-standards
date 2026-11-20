// The deploy migration step mounts database/migrations where the image's runner looks for it (#770 follow-up).
// The runner (standard/migrate.ts) reads `../../../database/migrations/` relative to its own file, which in the image is
// <last WORKDIR of backend/Dockerfile>/dist/standard/migrate.js. When #770 moved the WORKDIR to /app/backend the old mount
// target /database/migrations no longer matched and the first deploy failed with ENOENT scandir '/app/database/migrations/'.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);

function render(target) {
  const folders = data.sync.profiles[target.profile].templates;
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  const text = (file) => {
    const found = files.find((f) => f.path === file);
    assert.ok(found, `${target.repo} receives ${file}`);
    return found.content;
  };
  return { deploy: text('deploy/remote-deploy.sh'), get dockerfile() { return text('backend/Dockerfile'); }, get migrate() { return text('backend/src/standard/migrate.ts'); } };
}

const apps = data.sync.targets.filter((t) => t.profile === 'app');

test('the migration mount target is where the runner in the image looks for database/migrations', () => {
  assert.ok(apps.length >= 8);
  for (const target of apps) {
    const { deploy, dockerfile, migrate } = render(target);
    const workdirs = [...dockerfile.matchAll(/^WORKDIR (\S+)$/gm)].map((m) => m[1]);
    const workdir = workdirs.at(-1);
    assert.ok(workdir?.startsWith('/'), `${target.repo}: the final WORKDIR is absolute`);
    const ups = /new URL\('((?:\.\.\/)+)database\/migrations\/', import\.meta\.url\)/.exec(migrate)?.[1];
    assert.ok(ups, `${target.repo}: migrate.ts reads database/migrations relative to its own file`);
    // tsc keeps src/standard/migrate.ts at dist/standard/migrate.js, under the WORKDIR.
    const lookedUp = path.posix.resolve(path.posix.join(workdir, 'dist/standard'), ups, 'database/migrations');
    const mount = /-v "\$PWD\/database\/migrations:([^:"]+):ro"/.exec(deploy)?.[1];
    assert.ok(mount, `${target.repo}: remote-deploy.sh mounts database/migrations for the migrate step`);
    assert.equal(mount, lookedUp, `${target.repo}: mounted at ${mount} but the runner reads ${lookedUp} (WORKDIR ${workdir})`);
  }
});

test('services run their migrations inside the image, so the app mount step is skipped for them', () => {
  const services = data.sync.targets.filter((t) => t.profile === 'service');
  assert.ok(services.length >= 2);
  for (const target of services) {
    const { deploy } = render(target);
    assert.match(deploy, /if \[ "image" = step \]; then/, `${target.repo}: the mount step is gated on migrate=step`);
  }
});
