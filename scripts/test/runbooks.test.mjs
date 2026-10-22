import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { loadAll } from '../lib/registry.mjs';
import { renderText } from '../lib/render.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = join(import.meta.dirname, '..', '..');
const dir = join(root, 'docs', 'runbooks');
const templates = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
const { data } = loadAll(root);

test('runbook templates exist', () => {
  assert.deepEqual(templates.sort(), ['backup-restore.md', 'daily.md', 'deploy.md', 'next-steps.md']);
});

test('every runbook template renders for every registered project', () => {
  for (const project of data.projects.projects) {
    const vars = buildVars(data, { repo: project.repos.umbrella, profile: 'app', project: project.name });
    for (const file of templates) {
      const out = renderText(readFileSync(join(dir, file), 'utf8'), vars, `docs/runbooks/${file}`);
      assert.doesNotMatch(out, /\{\{/, `${project.name} ${file}`);
    }
  }
});

test('the deploy runbook lists server .env keys without values', () => {
  const text = readFileSync(join(dir, 'deploy.md'), 'utf8');
  for (const key of ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'WEB_BIND', 'WEB_PORT', 'NODE_AUTH_TOKEN']) {
    assert.match(text, new RegExp(`\\| \`${key}\` \\|`), key);
  }
  assert.doesNotMatch(text, /(PASSWORD|TOKEN)=\S/);
});
