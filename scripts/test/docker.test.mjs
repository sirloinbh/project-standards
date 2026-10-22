import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { HEADER_TEXT } from '../lib/render.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const render = (project) => {
  const target = data.sync.targets.find((t) => t.project === project);
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
};
const study = render('study-log');
const workout = render('workout-memo');

test('Dockerfiles use the pinned images and npm from versions.json', () => {
  for (const file of ['frontend/Dockerfile', 'backend/Dockerfile']) {
    assert.match(study[file], /^FROM node:24\.21\.0-alpine AS build$/m, file);
    assert.match(study[file], /npm install --global npm@11\.19\.0 --ignore-scripts/, file);
  }
  assert.match(study['frontend/Dockerfile'], /^FROM nginx:1\.27-alpine$/m);
});

test('the package token reaches npm ci only through the BuildKit secret', () => {
  for (const file of ['frontend/Dockerfile', 'backend/Dockerfile']) {
    const text = study[file];
    assert.match(text, /RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN="\$\(cat \/run\/secrets\/npm_token 2>\/dev\/null\)" npm ci --ignore-scripts/, file);
    assert.doesNotMatch(text, /^(ARG|ENV)\s+NODE_AUTH_TOKEN/m, `${file}: no token in ARG or ENV`);
    assert.match(text, /COPY package\*\.json \.npmrc \.\//, `${file}: .npmrc is present for npm ci`);
    assert.ok(text.startsWith(`# ${HEADER_TEXT} templates/app/`), `${file}: managed header first`);
  }
});

test('API port comes from the registry in the backend Dockerfile and nginx', () => {
  assert.match(study['backend/Dockerfile'], /^EXPOSE 3102$/m);
  assert.match(study['frontend/nginx.conf'], /proxy_pass http:\/\/api:3102;/);
  assert.match(workout['backend/Dockerfile'], /^EXPOSE 3101$/m);
  assert.match(workout['frontend/nginx.conf'], /proxy_pass http:\/\/api:3101;/);
  assert.match(study['frontend/nginx.conf'], /add_header X-Content-Type-Options nosniff always;/);
});
