import assert from 'node:assert/strict';
import test from 'node:test';
import { addHeader, commentStyle, mergeSection, PROJECT_MARKER, renderFile, renderText } from '../lib/render.mjs';

const vars = { project: { name: 'study-log' }, ports: { web: 8102 }, versions: { node: '24.21.0' }, features: { e2e: false } };

test('fills dotted variables with or without spaces', () => {
  assert.equal(renderText('{{project.name}}:{{ ports.web }} node {{versions.node}} e2e={{features.e2e}}', vars), 'study-log:8102 node 24.21.0 e2e=false');
});

test('leaves GitHub Actions ${{ }} expressions untouched', () => {
  const yml = 'image: node:{{versions.node}}\nref: ${{ github.sha }}\ntoken: ${{secrets.NODE_AUTH_TOKEN}}';
  assert.equal(renderText(yml, vars), 'image: node:24.21.0\nref: ${{ github.sha }}\ntoken: ${{secrets.NODE_AUTH_TOKEN}}');
});

test('fails on missing or non-scalar variables and names the file', () => {
  assert.throws(() => renderText('{{project.title}} {{ports}}', vars, 'templates/app/x'), {
    message: 'templates/app/x: undefined template variable(s): project.title, ports',
  });
});

test('picks a comment style per file type', () => {
  assert.equal(commentStyle('.editorconfig'), 'hash');
  assert.equal(commentStyle('frontend/Dockerfile'), 'hash');
  assert.equal(commentStyle('.github/workflows/ci.yml'), 'hash');
  assert.equal(commentStyle('scripts/claude-skills.mjs'), 'slash');
  assert.equal(commentStyle('AGENTS.md'), 'html');
  assert.equal(commentStyle('src/theme.css'), 'css');
  assert.equal(commentStyle('.prettierrc.json'), null);
  assert.equal(commentStyle('.nvmrc'), null);
});

test('adds the header on the first line pointing to the template folder', () => {
  assert.equal(
    addHeader('root = true\n', '.editorconfig', 'templates/common/.editorconfig'),
    '# 중앙 관리 파일. 수정은 sirloinbh/project-standards의 templates/common/에서\nroot = true\n',
  );
});

test('keeps shebangs, Dockerfile directives, and Markdown frontmatter first', () => {
  assert.match(addHeader('#!/usr/bin/env bash\necho\n', 'deploy/run.sh', 'templates/app/deploy/run.sh'), /^#!\/usr\/bin\/env bash\n# 중앙 관리 파일/);
  assert.match(addHeader('# syntax=docker/dockerfile:1\nFROM node\n', 'Dockerfile', 'templates/app/Dockerfile'), /^# syntax=docker\/dockerfile:1\n# 중앙 관리 파일/);
  const skill = addHeader('---\nname: std-x\n---\n\n# 제목\n', 'skills/std-x/SKILL.md', 'templates/common/skills/std-x/SKILL.md');
  assert.match(skill, /^---\nname: std-x\n---\n\n<!-- 중앙 관리 파일\. 수정은 sirloinbh\/project-standards의 templates\/common\/skills\/std-x\/에서 -->\n\n# 제목/);
});

test('does not add a second header or a header to JSON', () => {
  const once = addHeader('root = true\n', '.editorconfig', 'templates/common/.editorconfig');
  assert.equal(addHeader(once, '.editorconfig', 'templates/common/.editorconfig'), once);
  assert.equal(addHeader('{}\n', '.prettierrc.json', 'templates/app/.prettierrc.json'), '{}\n');
});

test('section files keep the target project part below the marker', () => {
  const rendered = `node_modules/\n.env\n${PROJECT_MARKER}\n`;
  assert.equal(mergeSection(rendered, `old/\n${PROJECT_MARKER}\r\ntest-results/\r\n`, '.gitignore'), `node_modules/\n.env\n${PROJECT_MARKER}\ntest-results/\n`);
  assert.equal(mergeSection(rendered, null, '.gitignore'), `node_modules/\n.env\n${PROJECT_MARKER}\n`);
  assert.equal(mergeSection(rendered, 'no marker yet\n', '.gitignore'), `node_modules/\n.env\n${PROJECT_MARKER}\n`);
  assert.throws(() => mergeSection('node_modules/\n', null, '.gitignore'), /must end with "# --- project ---"/);
});

test('renderFile normalizes CRLF templates, fills variables, and adds the header', () => {
  const out = renderFile({ text: '﻿param()\r\nWrite-Host {{project.name}}\r\n', file: 'scripts/x.ps1', source: 'templates/app/scripts/x.ps1', vars });
  assert.equal(out, '# 중앙 관리 파일. 수정은 sirloinbh/project-standards의 templates/app/scripts/에서\nparam()\nWrite-Host study-log\n');
});
