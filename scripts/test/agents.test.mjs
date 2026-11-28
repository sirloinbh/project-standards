import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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
  const profile = data.sync.profiles[target.profile];
  const project = data.projects.projects.find((p) => p.name === target.project);
  // The ui feature folder carries the std-ux-audit skill (#1168), so it joins like it does in planTarget.
  const featureFolders = Object.entries(profile.featureTemplates ?? {}).filter(([feature]) => project?.features?.[feature]).map(([, folder]) => folder);
  const folders = [...profile.templates, ...featureFolders];
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return { target, files: Object.fromEntries(files.map((f) => [f.path, f])) };
});
const apps = rendered.filter((r) => r.target.profile === 'app');

test('every app gets AGENTS.md and CLAUDE.md that point to AGENTS.project.md', () => {
  for (const { target, files } of apps) {
    const project = data.projects.projects.find((p) => p.name === target.project);
    const agents = files['AGENTS.md'].content;
    assert.match(agents, new RegExp(`^<!-- ${HEADER_TEXT} templates/app/ -->\n# ${project.title} Project Instructions\n`), target.repo);
    assert.ok(agents.includes(project.summary), target.repo);
    assert.ok(agents.includes('**Always read and follow [AGENTS.project.md](AGENTS.project.md) as well**'), target.repo);
    assert.ok(agents.includes(`Register an issue in \`sirloinbh/${project.repos.umbrella}\`.`), target.repo);
    // The agent reviews and merges its own PR in every app repo (#591); AGENTS.project.md may only be stricter.
    assert.ok(agents.includes('Review and merge your own PR as std-code-review section 8 says'), target.repo);
    assert.ok(!agents.includes('only the user merges'), target.repo);
    assert.ok(agents.includes(`web ${project.ports.web}, API ${project.ports.api}, Vite ${project.ports.vite}, host DB ${project.ports.db}`), target.repo);
    // Claude Code loads @ imports every session but never follows markdown links (#447).
    assert.match(files['CLAUDE.md'].content, /^@AGENTS\.md\n@AGENTS\.project\.md$/m, target.repo);
  }
});

test('the central CLAUDE.md imports AGENTS.md and only links the requirements source', () => {
  const claude = readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /^@AGENTS\.md$/m);
  assert.doesNotMatch(claude, /^@docs\//m);
  assert.ok(claude.includes('[docs/bootstrap-prompt.md](docs/bootstrap-prompt.md)'));
});

// Claude Code loads CLAUDE.md, its imports, and rules without `paths:` every session; the total stays under
// 200 lines (#448). Synced files may use 120, leaving 80 for AGENTS.project.md and the global ~/.claude/CLAUDE.md.
const lineCount = (text) => text.replace(/\n$/, '').split('\n').length;
const SYNCED_BUDGET = 120;
const CENTRAL_BUDGET = 180;

test('every synced rule file is path-scoped, so it loads only for matching files', () => {
  for (const { target, files } of rendered) {
    for (const [file, { content }] of Object.entries(files)) {
      if (!file.startsWith('.claude/rules/')) continue;
      assert.match(content, /^---\npaths:\n( {2}- "[^"]+"\n)+---\n/, `${target.repo} ${file}`);
    }
  }
});

test('the instructions loaded every session stay within the line budget', () => {
  for (const { target, files } of apps) {
    const total = lineCount(files['CLAUDE.md'].content) + lineCount(files['AGENTS.md'].content);
    assert.ok(total <= SYNCED_BUDGET, `${target.repo}: ${total} lines`);
  }
  const central = ['CLAUDE.md', 'AGENTS.md'].map((f) => lineCount(readFileSync(path.join(root, f), 'utf8')));
  const always = readdirSync(path.join(root, '.claude/rules'))
    .map((f) => readFileSync(path.join(root, '.claude/rules', f), 'utf8'))
    .filter((text) => !/^---\npaths:/.test(text.replace(/\r\n/g, '\n')))
    .map(lineCount);
  const total = [...central, ...always].reduce((a, b) => a + b, 0);
  assert.ok(total <= CENTRAL_BUDGET, `project-standards: ${total} lines`);
});

test('app repositories get all shared skills, mirrored into .claude/skills', () => {
  for (const { target, files } of apps) {
    for (const skill of ['std-implementation', 'std-testing', 'std-foundation', 'std-ux-audit', 'std-backlog', 'std-git-writing', 'std-communication', 'std-session-notes', 'std-code-review', 'std-feature-overview', 'orca-lanes']) {
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
      const match = content.match(/^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n(?:[a-z-]+: [^\n]+\n)*---\n\n<!-- ([^\n]+) -->\n/);
      assert.ok(match, `${target.repo} ${file} frontmatter and header`);
      assert.equal(match[1], path.posix.basename(path.posix.dirname(file)), `${target.repo} ${file} name`);
      assert.ok(match[2].length > 40, `${target.repo} ${file} description`);
      assert.ok(match[3].startsWith(HEADER_TEXT), `${target.repo} ${file} header`);
    }
  }
});

test('project-specific skill text uses the project title and repository', () => {
  const study = apps.find((r) => r.target.project === 'study-log').files;
  assert.match(study['skills/std-testing/SKILL.md'].content, /# Study Log Writing and Running Tests/);
  assert.match(study['skills/std-foundation/SKILL.md'].content, /# Study Log Development Foundation/);
  assert.match(study['skills/std-implementation/SKILL.md'].content, /This skill applies to changes in the `sirloinbh\/study-log` repo/);
});

test('CI callers pin the central workflow to the synced commit and pass registry values', () => {
  const ci = (project) => apps.find((r) => r.target.project === project).files['.github/workflows/ci.yml'].content;
  assert.match(ci('workout-memo'), /uses: sirloinbh\/project-standards\/\.github\/workflows\/reusable-app-ci\.yml@abcdef1234567\n/);
  assert.match(ci('workout-memo'), /db-name: 'workout_test'\n {6}e2e: true\n/);
  // The e2e flag follows the registry (#569 turns it on app by app), so this checks the value is passed through.
  const studyE2e = data.projects.projects.find((p) => p.name === 'study-log').features.e2e;
  assert.match(ci('study-log'), new RegExp(`db-name: 'study_test'\n {6}e2e: ${studyE2e}\n`));
  assert.match(ci('study-log'), /postgres-image: 'postgres:17-alpine'/);
  const infra = rendered.find((r) => r.target.profile === 'infra').files['.github/workflows/ci.yml'].content;
  assert.match(infra, /reusable-infra-ci\.yml@abcdef1234567\n/);
  assert.match(infra, /terraform-version: '1\.16\.5'/);
});

test('the infra repository gets the common skills but no app-only files', () => {
  const infra = rendered.find((r) => r.target.profile === 'infra').files;
  assert.match(infra['skills/std-implementation/SKILL.md'].content, /`sirloinbh\/shared-aws-infrastructure` repo/);
  for (const appOnly of ['skills/std-testing/SKILL.md', '.npmrc', '.claude/rules/backend.md']) assert.equal(infra[appOnly], undefined, appOnly);
  assert.match(infra['skills/std-communication/SKILL.md'].content, /Every explanation addressed to the user is written in English/);
  assert.equal(infra['.claude/skills/std-communication/SKILL.md'].content, infra['skills/std-communication/SKILL.md'].content);
});

test('the infra repository gets a managed AGENTS.md and a CLAUDE.md that imports it (#949)', () => {
  const infra = rendered.find((r) => r.target.profile === 'infra').files;
  const agents = infra['AGENTS.md'].content;
  assert.match(agents, new RegExp(`^<!-- ${HEADER_TEXT} templates/infra/ -->\n# Shared AWS Infrastructure Instructions\n`));
  assert.ok(agents.includes('Register an issue in `sirloinbh/shared-aws-infrastructure`.'));
  // The Terraform rules of the hand-written file must survive the move to a template.
  for (const kept of ['Do not commit Terraform state', 'Do not plan or apply with a company AWS profile or the default profile', 'terraform fmt -check -recursive', 'terraform validate', 'Merging is not applying']) assert.ok(agents.includes(kept), kept);
  assert.ok(agents.includes('**Always read and follow [AGENTS.project.md](AGENTS.project.md)'));
  // Claude Code loads @ imports every session but never follows markdown links (#447).
  assert.match(infra['CLAUDE.md'].content, /^@AGENTS\.md\n@AGENTS\.project\.md$/m);
});
