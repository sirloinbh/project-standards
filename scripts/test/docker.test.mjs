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
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
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
    assert.match(text, /COPY package\.json package-lock\.json \.npmrc \.\//, `${file}: the root lockfile and .npmrc are present for npm ci`);
    assert.match(text, /npm ci (--omit=dev )?--ignore-scripts -w (frontend|backend)$/m, `${file}: installs one workspace from the root lockfile (ADR-0022)`);
    assert.ok(text.startsWith(`# ${HEADER_TEXT} templates/`), `${file}: managed header first`);
  }
});

test('API port comes from the registry in the backend Dockerfile and nginx', () => {
  assert.match(study['backend/Dockerfile'], /^EXPOSE 3102$/m);
  assert.match(study['frontend/nginx.conf'], /proxy_pass http:\/\/api:3102;/);
  assert.match(workout['backend/Dockerfile'], /^EXPOSE 3101$/m);
  assert.match(workout['frontend/nginx.conf'], /proxy_pass http:\/\/api:3101;/);
  assert.match(study['frontend/nginx.conf'], /add_header X-Content-Type-Options nosniff always;/);
});

test('nginx limits API requests per client IP and answers 429 above the limit (#291)', () => {
  const conf = study['frontend/nginx.conf'];
  // The zone lives outside server {}: the file is included inside the http block.
  const zone = conf.indexOf('limit_req_zone $binary_remote_addr zone=api:1m rate=10r/s;');
  assert.ok(zone >= 0 && zone < conf.indexOf('server {'), 'zone declared before the server block');
  const api = conf.match(/location \/api\/ \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(api, /limit_req zone=api burst=40 nodelay;/);
  assert.match(api, /limit_req_status 429;/);
  assert.match(api, /proxy_pass http:\/\/api:3102;/);
  assert.doesNotMatch(conf.replace(api, ''), /limit_req zone=/, 'only the API is limited, not the static files');
});

test('nginx answers to the app subdomain and limits by the client IP the proxy forwards (#254)', () => {
  assert.match(study['frontend/nginx.conf'], /listen 80 default_server;\n[\s\S]*server_name study-log\.daysofme\.com;/);
  assert.match(workout['frontend/nginx.conf'], /server_name workout-memo\.daysofme\.com;/);
  const conf = study['frontend/nginx.conf'];
  assert.match(conf, /set_real_ip_from 127\.0\.0\.1;\n {2}set_real_ip_from 172\.16\.0\.0\/12;\n {2}real_ip_header X-Forwarded-For;/);
  assert.doesNotMatch(conf, /server_name _;|real_ip_recursive/);
});

test('nginx keeps the 1m body limit for /api/ unless the app sets service.apiBodyMb (#589)', () => {
  const limit = (conf) => conf.match(/location \/api\/ \{([\s\S]*?)\n {2}\}/)[1].match(/client_max_body_size (\S+);/)?.[1];
  assert.equal(limit(study['frontend/nginx.conf']), '21m');
  assert.equal(limit(workout['frontend/nginx.conf']), '1m');
});

test('nginx waits up to 300 s for a slow API call on /api/ only (#1011)', () => {
  for (const conf of [study['frontend/nginx.conf'], workout['frontend/nginx.conf']]) {
    const api = conf.match(/location \/api\/ \{([\s\S]*?)\n {2}\}/)[1];
    assert.match(api, /proxy_read_timeout 300s;/);
    assert.match(api, /proxy_send_timeout 300s;/);
    assert.doesNotMatch(conf.replace(api, ''), /proxy_(read|send)_timeout/, 'static files keep the default');
  }
});

test('the backend image installs npm before copying package files, so a dependency change keeps that layer (#963)', () => {
  const lines = study['backend/Dockerfile'].split('\n');
  const installs = lines.flatMap((l, i) => (l.startsWith('RUN npm install --global npm@') ? [i] : []));
  const copies = lines.flatMap((l, i) => (/^COPY package/.test(l) ? [i] : []));
  assert.equal(installs.length, 2, 'build and prod-deps stages');
  assert.equal(copies.length, 2);
  installs.forEach((n, k) => assert.ok(n < copies[k], `stage ${k + 1}: npm install (line ${n + 1}) before COPY package (line ${copies[k] + 1})`));
  assert.match(study['.dockerignore'], /^backend\/test$/m, 'the build context skips backend tests');
});

test('the service backend image does the same and skips test/', () => {
  const target = data.sync.targets.find((t) => t.profile === 'service');
  const files = Object.fromEntries(renderProfile({ root, profile: 'service', folders: data.sync.profiles.service.templates, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) }).map((f) => [f.path, f.content]));
  const text = files['backend/Dockerfile'];
  assert.ok(text.indexOf('RUN npm install --global npm@') < text.indexOf('COPY package*.json'), 'npm install first');
  assert.match(files['backend/.dockerignore'], /^test$/m);
});
