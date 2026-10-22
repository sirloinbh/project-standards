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

// Renders every sync target once; a missing template variable throws here.
const rendered = data.sync.targets.map((target) => {
  const folders = data.sync.profiles[target.profile].templates;
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return { target, files: Object.fromEntries(files.map((f) => [f.path, f])) };
});
const apps = rendered.filter((r) => r.target.profile === 'app');

test('every app gets AGENTS.md and CLAUDE.md that point to AGENTS.project.md', () => {
  for (const { target, files } of apps) {
    const project = data.projects.projects.find((p) => p.name === target.project);
    const agents = files['AGENTS.md'].content;
    assert.match(agents, new RegExp(`^<!-- ${HEADER_TEXT} templates/app/에서 -->\n# ${project.title} 프로젝트 지침\n`), target.repo);
    assert.ok(agents.includes(project.summary), target.repo);
    assert.ok(agents.includes('[AGENTS.project.md](AGENTS.project.md)를 반드시 함께 읽고 따른다'), target.repo);
    assert.ok(agents.includes(`\`sirloinbh/${project.repos.umbrella}\`에 이슈를 등록한다`), target.repo);
    // Merge rules belong to each project (workout-memo lets the agent merge after CI); default is user-only.
    assert.ok(agents.includes('PR 리뷰와 병합 규칙은 [AGENTS.project.md](AGENTS.project.md)를 따른다. 거기에 정해져 있지 않으면 **PR 병합은 사용자만 수행한다.**'), target.repo);
    assert.ok(agents.includes(`웹 ${project.ports.web}, API ${project.ports.api}, Vite ${project.ports.vite}, 호스트 DB ${project.ports.db}`), target.repo);
    assert.ok(files['CLAUDE.md'].content.includes('[AGENTS.project.md](AGENTS.project.md)'), target.repo);
  }
});

test('app repositories get all five shared skills, mirrored into .claude/skills', () => {
  for (const { target, files } of apps) {
    for (const skill of ['std-implementation', 'std-testing', 'std-foundation', 'std-backlog', 'std-git-writing']) {
      const source = files[`skills/${skill}/SKILL.md`];
      const mirror = files[`.claude/skills/${skill}/SKILL.md`];
      assert.ok(source, `${target.repo} ${skill}`);
      assert.equal(mirror.content, source.content, `${target.repo} ${skill} mirror`);
    }
  }
});

test('skill files have a matching name, a description, and the header after the frontmatter', () => {
  for (const { target, files } of rendered) {
    for (const [file, { content }] of Object.entries(files)) {
      if (!file.endsWith('/SKILL.md')) continue;
      const match = content.match(/^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n\n<!-- ([^\n]+) -->\n/);
      assert.ok(match, `${target.repo} ${file} frontmatter and header`);
      assert.equal(match[1], path.posix.basename(path.posix.dirname(file)), `${target.repo} ${file} name`);
      assert.ok(match[2].length > 40, `${target.repo} ${file} description`);
      assert.ok(match[3].startsWith(HEADER_TEXT), `${target.repo} ${file} header`);
    }
  }
});

test('project-specific skill text uses the project title and repository', () => {
  const study = apps.find((r) => r.target.project === 'study-log').files;
  assert.match(study['skills/std-testing/SKILL.md'].content, /# 공부 기록 테스트 작성과 실행/);
  assert.match(study['skills/std-foundation/SKILL.md'].content, /# 공부 기록 개발 기반/);
  assert.match(study['skills/std-implementation/SKILL.md'].content, /이 스킬은 `sirloinbh\/study-log` 리포의 변경 작업에 적용한다/);
});

test('CI callers pin the central workflow to the synced commit and pass registry values', () => {
  const ci = (project) => apps.find((r) => r.target.project === project).files['.github/workflows/ci.yml'].content;
  assert.match(ci('workout-memo'), /uses: sirloinbh\/project-standards\/\.github\/workflows\/reusable-app-ci\.yml@abcdef1234567\n/);
  assert.match(ci('workout-memo'), /db-name: 'workout_test'\n {6}e2e: true\n/);
  assert.match(ci('study-log'), /db-name: 'study_test'\n {6}e2e: false\n/);
  assert.match(ci('study-log'), /postgres-image: 'postgres:17-alpine'/);
  const infra = rendered.find((r) => r.target.profile === 'infra').files['.github/workflows/ci.yml'].content;
  assert.match(infra, /reusable-infra-ci\.yml@abcdef1234567\n/);
  assert.match(infra, /terraform-version: '1\.16\.5'/);
});

test('the infra repository gets the common skills but no app-only files', () => {
  const infra = rendered.find((r) => r.target.profile === 'infra').files;
  assert.match(infra['skills/std-implementation/SKILL.md'].content, /`sirloinbh\/shared-aws-infrastructure` 리포/);
  for (const appOnly of ['AGENTS.md', 'skills/std-testing/SKILL.md', '.npmrc']) assert.equal(infra[appOnly], undefined, appOnly);
});
