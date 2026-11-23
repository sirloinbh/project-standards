import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { anchorsOf, check, linksOf, slugify } from '../check-doc-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'scripts/check-doc-links.mjs');

function repo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-links-'));
  for (const [rel, value] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), value);
  }
  return dir;
}

test('slugify follows the GitHub rules', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('`code` and [a link](x.md)'), 'code-and-a-link');
  assert.equal(slugify('Phase 2: A_B - C'), 'phase-2-a_b---c');
  assert.equal(slugify('한글 제목'), '한글-제목');
});

test('anchorsOf numbers duplicate headings and reads explicit ids', () => {
  const anchors = anchorsOf('# Intro\n\n## Setup\n\n## Setup\n\n<a name="Custom"></a>\n\n```\n# not a heading\n```\n');
  assert.deepEqual([...anchors].sort(), ['custom', 'intro', 'setup', 'setup-1']);
});

test('linksOf skips code, fences and comments, and reads reference definitions', () => {
  const text = [
    '[a](one.md) and `[b](two.md)` and ![img](three.png "title")',
    '```',
    '[c](four.md)',
    '```',
    '<!-- [d](five.md) -->',
    '[ref]: six.md',
    '[e](<seven file.md>)',
  ].join('\n');
  assert.deepEqual(linksOf(text).map((l) => l.target), ['one.md', 'three.png', 'six.md', 'seven file.md']);
});

test('a missing file fails and a present file or directory passes', () => {
  const dir = repo({ 'a.md': '[ok](b.md) [dir](sub/) [gone](missing.md)\n', 'b.md': '# B\n', 'sub/x.md': 'x\n' });
  const errors = check(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^a\.md:1: .*missing\.md.*missing file/);
});

test('a missing anchor fails, a present anchor passes, in the same file and another file', () => {
  const dir = repo({
    'a.md': '# Top\n[self ok](#top) [self bad](#nope) [other ok](b.md#deep-dive) [other bad](b.md#shallow)\n',
    'b.md': '## Deep dive\n',
  });
  const errors = check(dir);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /#nope/);
  assert.match(errors[1], /#shallow/);
});

test('relative paths resolve from the linking file, and a leading slash from the root', () => {
  const dir = repo({ 'docs/a.md': '[up](../top.md) [root](/top.md) [bad](../../out.md)\n', 'top.md': 'x\n' });
  const errors = check(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /outside the repository/);
});

test('urls, placeholders, template files and the skipped folders are ignored', () => {
  const dir = repo({
    'a.md': '[web](https://example.com/x.md) [mail](mailto:a@b.c) [ph]({{link}}) [ph2](${x}.md)\n',
    'a.md.tmpl': '[bad](missing.md)\n',
    'templates/app/x.md': '[bad](missing.md)\n',
    'scaffold/y.md': '[bad](missing.md)\n',
    'docs/daily/z.md': '[bad](missing.md)\n',
    'node_modules/p/README.md': '[bad](missing.md)\n',
  });
  assert.deepEqual(check(dir), []);
});

test('the script exits 1 with a message on a broken link and 0 on a clean repository', () => {
  const bad = spawnSync('node', [script, '--root', repo({ 'a.md': '[x](missing.md)\n' })], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /missing\.md/);
  const good = spawnSync('node', [script, '--root', repo({ 'a.md': '# A\n[x](#a)\n' })], { encoding: 'utf8' });
  assert.equal(good.status, 0);
});

test('this repository has no broken documentation links', () => {
  assert.deepEqual(check(root), []);
});
