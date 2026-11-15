// Tests the managed frontend file templates/ui/frontend/src/auth-origin.ts (#551) in the central repository.
// Apps run the same cases with Vitest (templates/ui/frontend/src/auth-origin.test.ts); Node strips the types here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { authOrigin } from '../../templates/ui/frontend/src/auth-origin.ts';

test('the sign-in origin replaces the app name with auth', () => {
  assert.equal(authOrigin({ protocol: 'https:', hostname: 'study-log.daysofme.com' }), 'https://auth.daysofme.com');
});

test('local and IP addresses have no sign-in', () => {
  for (const hostname of ['localhost', 'app.localhost', '127.0.0.1', '3.38.114.136', '[::1]', 'api'])
    assert.equal(authOrigin({ protocol: 'http:', hostname }), null, hostname);
});
