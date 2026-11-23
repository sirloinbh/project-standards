import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { compareOutputs, MARKER, postComment, renderComment } from '../downstream-diff.mjs';

function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-'));
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), text);
  }
  return dir;
}

test('compareOutputs lists added, changed and removed files per repo and skips repos that did not change', () => {
  const base = tree({ 'app-a/a.md': '1', 'app-a/gone.md': 'x', 'app-a/same.md': 's', 'app-b/s.md': 's' });
  const head = tree({ 'app-a/a.md': '2', 'app-a/new.md': 'n', 'app-a/same.md': 's', 'app-b/s.md': 's' });
  assert.deepEqual(compareOutputs(base, head), [{ repo: 'app-a', added: ['new.md'], changed: ['a.md'], removed: ['gone.md'] }]);
});

test('renderComment is null when nothing changes and a table otherwise, capped per repo', () => {
  assert.equal(renderComment([]), null);
  const many = Array.from({ length: 10 }, (_, i) => `f${i}.md`);
  const text = renderComment([{ repo: 'app-a', added: many, changed: ['c.md'], removed: ['r.md'] }]);
  assert.ok(text.startsWith(MARKER));
  assert.match(text, /\| app-a \| 10 \| 1 \| 1 \|/);
  assert.match(text, /added: .*`f7\.md`, and 2 more/);
  assert.match(text, /no longer managed: `r\.md`/);
});

function fakeApi(existing) {
  const calls = [];
  const api = async (method, p, body) => {
    calls.push(`${method} ${p}`);
    return method === 'GET' ? existing : null;
  };
  return { api, calls };
}

test('postComment creates, updates in place, leaves an equal one, and deletes when nothing changes', async () => {
  const body = `${MARKER}\nhello`;
  let f = fakeApi([{ id: 1, body: 'someone else' }]);
  assert.equal(await postComment({ api: f.api, repo: 'o/r', pr: 5, body }), 'created');
  assert.ok(f.calls.includes('POST /repos/o/r/issues/5/comments'));
  f = fakeApi([{ id: 9, body: `${MARKER}\nold` }]);
  assert.equal(await postComment({ api: f.api, repo: 'o/r', pr: 5, body }), 'updated');
  assert.ok(f.calls.includes('PATCH /repos/o/r/issues/comments/9'));
  f = fakeApi([{ id: 9, body }]);
  assert.equal(await postComment({ api: f.api, repo: 'o/r', pr: 5, body }), 'unchanged');
  assert.equal(await postComment({ api: f.api, repo: 'o/r', pr: 5, body: null }), 'deleted');
  assert.ok(f.calls.includes('DELETE /repos/o/r/issues/comments/9'));
  f = fakeApi([]);
  assert.equal(await postComment({ api: f.api, repo: 'o/r', pr: 5, body: null }), 'none');
});
