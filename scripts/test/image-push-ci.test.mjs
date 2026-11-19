// The reusable app CI can push images to GHCR on main, off by default (ADR-0023, #754).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inlineReusable } from '../lib/inline-ci.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const reusable = read('.github/workflows/reusable-app-ci.yml');
const caller = read('templates/app/.github/workflows/ci.yml.tmpl');
const job = (text, name) => new RegExp(`\n  ${name}:\n((?:    .*\n|\n)+)`).exec(text)?.[1] ?? '';

test('image pushing is an input that defaults to off', () => {
  assert.match(reusable, /\n {6}push-images:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: false\n/);
  assert.match(reusable, /\n {6}image-keep:\n(?: {8}.*\n)*? {8}type: number\n {8}default: 2\n/);
  assert.match(caller, /^ {6}push-images: \{\{project\.deploy\.push\}\}$/m);
  assert.match(caller, /^ {6}image-prefix: 'ghcr\.io\/sirloinbh\/\{\{project\.db\.name\}\}'$/m);
});

test('only the image-push job can write packages, and only on a push to main after docker-build passed', () => {
  const push = job(reusable, 'image-push');
  assert.match(push, /needs: \[changes, docker-build\]\n/);
  assert.match(push, /needs\.docker-build\.result == 'success' && inputs\.push-images && github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(push, /\n {4}permissions:\n {6}contents: read\n {6}packages: write\n/);
  // Everything else stays at the read-only top-level permissions.
  assert.equal((reusable.match(/^\s+packages: write$/gm) ?? []).length, 1);
  assert.match(reusable, /\npermissions:\n {2}contents: read\n {2}packages: read/);
  // The caller must allow write, or GitHub rejects the whole workflow when it starts.
  assert.match(caller, /^permissions:\n {2}contents: read\n(?: {2}#.*\n)* {2}packages: write\n/m);
});

test('the push job tags by commit, links the repository, and keeps retention from failing the run', () => {
  const push = job(reusable, 'image-push');
  assert.match(push, /tag=\$\{GITHUB_SHA:0:12\}/);
  assert.match(push, /org\.opencontainers\.image\.source=\$SOURCE/);
  assert.match(push, /printf '%s' "\$GH_TOKEN" \| docker login ghcr\.io -u "\$GITHUB_ACTOR" --password-stdin/);
  assert.match(push, /--secret id=npm_token,env=NODE_AUTH_TOKEN/);
  assert.match(push, /name: Keep only the newest versions\n {8}continue-on-error: true\n/);
  // The inputs reach the shell as environment variables, never inside the script text.
  assert.doesNotMatch(push.replace(/^ {6}[A-Z_]+: \$\{\{.*\}\}$/gm, ''), /\$\{\{ inputs\./);
});

test('a public app inlines the workflow with the job switched off', () => {
  const text = inlineReusable(reusable, {
    'node-version': '24',
    'npm-version': '11',
    'postgres-image': 'postgres:17',
    'db-name': 'x_test',
    'push-images': false,
    'image-prefix': 'ghcr.io/sirloinbh/x',
  });
  const push = job(text, 'image-push');
  assert.match(push, /&& false && github\.event_name == 'push'/);
  assert.match(push, /IMAGE_PREFIX: ghcr\.io\/sirloinbh\/x\n/);
  assert.match(push, /IMAGE_KEEP: 2\n/);
  assert.doesNotMatch(text, /inputs\./);
});

// The shared services push a single image through the reusable service CI, off by default (#757).
const service = read('.github/workflows/reusable-service-ci.yml');
const serviceCaller = read('templates/service/.github/workflows/ci.yml.tmpl');

test('the service CI pushes one backend image to GHCR, off by default, with write access only in that job', () => {
  assert.match(service, /\n {6}push-images:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: false\n/);
  assert.match(service, /\n {6}image-keep:\n(?: {8}.*\n)*? {8}type: number\n {8}default: 2\n/);
  assert.match(serviceCaller, /^ {6}push-images: \{\{project\.deploy\.push\}\}$/m);
  assert.match(serviceCaller, /^ {6}image-prefix: 'ghcr\.io\/sirloinbh\/\{\{project\.name\}\}'$/m);
  assert.match(serviceCaller, /^permissions:\n {2}contents: read\n(?: {2}#.*\n)* {2}packages: write\n/m);
  const push = job(service, 'image-push');
  assert.match(push, /needs: \[docker-build\]\n/);
  assert.match(push, /needs\.docker-build\.result == 'success' && inputs\.push-images && github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(push, /\n {4}permissions:\n {6}contents: read\n {6}packages: write\n/);
  assert.equal((service.match(/^\s+packages: write$/gm) ?? []).length, 1);
  assert.match(service, /\npermissions:\n {2}contents: read\n {2}packages: read/);
  assert.match(push, /tag=\$\{GITHUB_SHA:0:12\}/);
  assert.match(push, /-t "\$IMAGE_PREFIX-backend:\$tag" "\$WORKDIR"/);
  assert.match(push, /name: Keep only the newest versions\n {8}continue-on-error: true\n/);
  assert.doesNotMatch(push.replace(/^ {6}[A-Z_]+: \$\{\{.*\}\}$/gm, ''), /\$\{\{ inputs\./);
});

test('the image name the service CI pushes is the one the service deploy pulls', () => {
  // remote-deploy.sh pulls {{registry}}/{{images}}:<tag>; for a service that is ghcr.io/sirloinbh/<name>-backend.
  const deploy = read('templates/deploy/deploy/remote-deploy.sh.tmpl');
  assert.match(deploy, /docker pull --quiet "\{\{project\.deploy\.registry\}\}\/\$image:\$1"/);
  assert.match(read('scripts/lib/vars.mjs'), /images: `\$\{project\.name\}-backend`/);
});
