// cn() must know every text style in the design tokens, or tailwind-merge treats it as a colour (#357).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

test('the text styles in cn() match the design token utilities', () => {
  const tokens = [...read('packages/design-tokens/tailwind.css').matchAll(/^@utility text-(\S+) \{/gm)].map((m) => m[1]);
  const listed = /const TEXT_STYLES = \[(.*?)\];/.exec(read('templates/ui/frontend/src/lib/utils.ts'))[1].match(/[\w-]+/g);
  assert.ok(tokens.length > 0);
  assert.deepEqual(listed.toSorted(), tokens.toSorted());
});

test('the scaffold uses the same cn() as the synced template', () => {
  assert.equal(read('scaffold/app/frontend/src/lib/utils.ts').replaceAll('\r\n', '\n'), read('templates/ui/frontend/src/lib/utils.ts').replaceAll('\r\n', '\n'));
});
