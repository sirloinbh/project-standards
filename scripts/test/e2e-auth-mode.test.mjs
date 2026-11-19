// The e2e backend (templates/e2e/playwright.config.ts.tmpl) must start in an explicit local auth mode (#667, #750).
// Without it the managed auth.ts refuses to start, because AUTH_INTERNAL_URL is not set for e2e.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const config = fs.readFileSync('templates/e2e/playwright.config.ts.tmpl', 'utf8');
const auth = fs.readFileSync('templates/app/backend/src/standard/auth.ts', 'utf8');

test('the e2e API webServer sets an explicit local auth mode', () => {
  const backendEnv = /command: 'npx --no-install tsx backend\/src\/server\.ts'[\s\S]*?\n\s+env: (\{[^\n]*\}),/.exec(config)?.[1];
  assert.ok(backendEnv, 'the backend webServer env was not found');
  assert.match(backendEnv, /AUTH_DISABLED: '1'|NODE_ENV: '(development|test)'/);
  assert.doesNotMatch(backendEnv, /AUTH_INTERNAL_URL/, 'no fake sign-in URL in the e2e backend');
});

test('the mode the e2e config sets is one that auth.ts accepts as local', () => {
  assert.match(auth, /env\.AUTH_DISABLED === '1'/);
});
