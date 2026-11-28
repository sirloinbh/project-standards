// The top bar's sign-out is an icon link named "Sign out" (#1212). The apps own their sign-in tests, so the template source is checked here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(root, 'templates/ui/frontend/src/sign-in.tsx'), 'utf8');
const account = source.slice(source.indexOf('export function AccountActions'));

test('sign-out is a LogOutIcon in an icon-size ghost button with an accessible name and a title', () => {
  assert.match(source, /import \{ LogOutIcon \} from 'lucide-react';/);
  assert.match(account, /<Button asChild variant="ghost" size="icon">/);
  assert.match(account, /<a href=\{signOutUrl\(origin, window\.location\.origin\)\} aria-label="Sign out" title="Sign out">/);
  assert.match(account, /<LogOutIcon aria-hidden \/>/);
});

test('there is no visible "Sign out" text left, and the account name stays', () => {
  assert.doesNotMatch(account, />\s*Sign out\s*</);
  assert.match(account, /user\.name \?\? user\.email/);
});
