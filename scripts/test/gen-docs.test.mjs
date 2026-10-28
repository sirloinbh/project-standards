import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderProjects, renderVersions } from '../gen-docs.mjs';
import { loadAll } from '../lib/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);

test('lists every project with ports and shows unset values as 미정', () => {
  const text = renderProjects(data);
  assert.match(text, /\| 01 \| workout-memo \| 운동 기록 \| FORM · 나의 운동 기록 \| 운동 \| active \| workout \/ workout_test \| 미정 \| 미정 \| 1 \|/);
  assert.match(text, /\| dev-career-portfolio \| 8108 \| 3108 \| 3208 \| 5208 \| 5308 \| 15408 \|/);
  assert.match(text, /\| 루트 도메인 \| 미정 \|/);
  assert.match(text, /\| AWS 리전 \| ap-northeast-2 \|/);
});

test('shows a service host once it is set', () => {
  const copy = structuredClone(data);
  copy.projects.projects[0].service = { domain: 'example.com', subdomain: 'workout' };
  assert.match(renderProjects(copy), /\| workout\.example\.com \|/);
});

test('the committed docs/projects.md is up to date', () => {
  const committed = fs.readFileSync(path.join(root, 'docs/projects.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, renderProjects(data));
});

test('--check fails when the file is stale', () => {
  const target = path.join(root, 'docs/projects.md');
  const saved = fs.readFileSync(target);
  try {
    fs.writeFileSync(target, 'stale\n');
    assert.throws(() => execFileSync(process.execPath, [path.join(root, 'scripts/gen-docs.mjs'), '--check'], { stdio: 'pipe' }));
  } finally {
    fs.writeFileSync(target, saved);
  }
});

test('docs/versions.md lists every shared app dependency with its file and section (#304)', () => {
  const files = { root: 'package.json', frontend: 'frontend/package.json', backend: 'backend/package.json' };
  const text = renderVersions(data.versions, files);
  assert.match(text, /^# 버전 원본\n\n<!-- 자동 생성 파일/);
  const vite = data.versions.dependencies.frontend.devDependencies.vite;
  assert.ok(text.split('\n').includes(`| \`vite\` | ${vite} | \`frontend/package.json\` | devDependencies |`));
  assert.match(text, /\| 이미지 playwright \| `mcr\.microsoft\.com\/playwright:v[\d.]+-noble` \(digest 고정\) \|/);
  const count = Object.values(data.versions.dependencies).flatMap((s) => Object.values(s).flatMap(Object.keys)).length;
  assert.equal(text.split('\n').filter((l) => /\| `[^`]+` \| [\d.]+ \| `[a-z/]*package\.json` \|/.test(l)).length, count);
});
