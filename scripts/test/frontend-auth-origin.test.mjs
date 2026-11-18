// Tests the managed frontend file templates/ui/frontend/src/auth-origin.ts (#551, #668) in the central repository.
// Apps run the same cases with Vitest (templates/ui/frontend/src/auth-origin.test.ts); Node strips the types here.
// lib/auth-config.ts is rendered per app, so the root domain is passed in.
import assert from 'node:assert/strict';
import test from 'node:test';
import { authOrigin as origin } from '../../templates/ui/frontend/src/auth-origin.ts';

const ROOT = 'daysofme.com';
const authOrigin = (a, root = ROOT) => origin(a, root);

test('the sign-in origin replaces the app name with auth', () => {
  assert.equal(authOrigin({ protocol: 'https:', hostname: 'study-log.daysofme.com' }), 'https://auth.daysofme.com');
});

test('local and IP addresses have no sign-in', () => {
  for (const hostname of ['localhost', 'app.localhost', '127.0.0.1', '3.38.114.136', '[::1]', 'api'])
    assert.equal(authOrigin({ protocol: 'http:', hostname }), null, hostname);
});

test('hosts outside the root domain never get a sign-in origin (#668)', () => {
  for (const hostname of ['daysofme.com', 'myapp.pages.dev', 'example.co.kr', 'evil-daysofme.com', 'study-log.daysofme.com.evil.net', '.daysofme.com'])
    assert.equal(authOrigin({ protocol: 'https:', hostname }), null, hostname);
  assert.equal(authOrigin({ protocol: 'https:', hostname: 'a.daysofme.com' }, ''), null);
});
