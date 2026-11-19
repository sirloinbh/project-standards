// Tests the managed frontend file templates/ui/frontend/src/session-watch.ts (#596, #669) in the central repository.
// Apps run the same cases with Vitest (templates/ui/frontend/src/session-watch.test.ts); Node strips the types here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRedirectMark, createUnauthorizedHandler, LOOP_WINDOW_MS, REDIRECT_KEY } from '../../templates/ui/frontend/src/session-watch.ts';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
function spy() {
  const fn = () => void fn.calls++;
  fn.calls = 0;
  return fn;
}

test('the first 401 redirects once, however many requests fail together', () => {
  const redirect = spy();
  const onLoop = spy();
  const handle = createUnauthorizedHandler({ storage: memory(), redirect, onLoop });
  handle();
  handle();
  handle();
  assert.equal(redirect.calls, 1);
  assert.equal(onLoop.calls, 0);
});

test('a 401 right after a redirect stops instead of redirecting again', () => {
  const storage = memory();
  let time = 1_000_000;
  const redirect = spy();
  const onLoop = spy();
  createUnauthorizedHandler({ storage, redirect, onLoop, now: () => time })();
  time += 5_000;
  createUnauthorizedHandler({ storage, redirect, onLoop, now: () => time })();
  assert.equal(redirect.calls, 1);
  assert.equal(onLoop.calls, 1);
});

test('a session that ends long after the last redirect redirects again', () => {
  const storage = memory();
  let time = 1_000_000;
  const redirect = spy();
  const onLoop = spy();
  createUnauthorizedHandler({ storage, redirect, onLoop, now: () => time })();
  time += LOOP_WINDOW_MS + 1;
  createUnauthorizedHandler({ storage, redirect, onLoop, now: () => time })();
  assert.equal(redirect.calls, 2);
  assert.equal(onLoop.calls, 0);
});

test('the retry button clears the mark, so the next attempt redirects', () => {
  const storage = memory();
  const redirect = spy();
  createUnauthorizedHandler({ storage, redirect, onLoop: spy() })();
  assert.notEqual(storage.getItem(REDIRECT_KEY), null);
  clearRedirectMark(storage);
  createUnauthorizedHandler({ storage, redirect, onLoop: spy() })();
  assert.equal(redirect.calls, 2);
});

test('blocked storage still redirects', () => {
  const boom = () => {
    throw new Error('blocked');
  };
  const blocked = { getItem: boom, setItem: boom, removeItem: boom };
  const redirect = spy();
  createUnauthorizedHandler({ storage: blocked, redirect, onLoop: spy() })();
  createUnauthorizedHandler({ storage: undefined, redirect, onLoop: spy() })();
  clearRedirectMark(blocked);
  assert.equal(redirect.calls, 2);
});

test('no managed frontend file assigns window.fetch (#669)', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
  for (const file of walk('templates/ui/frontend/src').filter((f) => /\.(tsx?|tmpl)$/.test(f) && !/\.test\./.test(f)))
    assert.doesNotMatch(readFileSync(file, 'utf8'), /(window|globalThis)\.fetch\s*=[^=]/, file);
});
