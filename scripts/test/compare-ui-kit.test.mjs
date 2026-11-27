import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareUiKit, STAYS } from '../compare-ui-kit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const kit = path.join(root, 'templates/ui/frontend');

// A stand-in design-system checkout made from templates/ui: src/ and public/ without the files that stay.
function standIn() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-standin-'));
  fs.cpSync(kit, dir, { recursive: true });
  for (const f of STAYS) fs.rmSync(path.join(dir, f));
  const files = [];
  const walk = (folder) => {
    for (const e of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, e.name);
      if (e.isDirectory()) walk(full);
      else files.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  };
  walk(dir);
  return { dir, files };
}

test('a design-system kit equal to templates/ui renders the same files for every ui app', () => {
  const { dir, files } = standIn();
  try {
    const result = compareUiKit({ root, designSystemDir: dir, files });
    assert.deepEqual(result.problems, []);
    assert.ok(result.apps >= 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a changed file, a missing file and an extra file are reported', () => {
  const { dir, files } = standIn();
  try {
    fs.appendFileSync(path.join(dir, 'src/lib/utils.ts'), '\n// drift\n');
    fs.rmSync(path.join(dir, 'src/lib/theme.ts'));
    fs.writeFileSync(path.join(dir, 'src/extra.ts'), 'export {};\n');
    const list = [...files.filter((f) => f !== 'src/lib/theme.ts'), 'src/extra.ts'];
    const { problems } = compareUiKit({ root, designSystemDir: dir, files: list });
    assert.ok(problems.includes('design-system does not have src/lib/theme.ts (and it is not in STAYS)'));
    assert.ok(problems.includes('design-system has src/extra.ts, which templates/ui does not'));
    assert.ok(problems.some((p) => p.endsWith(': frontend/src/lib/utils.ts differs')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the files that stay exist in templates/ui', () => {
  for (const f of STAYS) assert.ok(fs.existsSync(path.join(kit, f)), f);
});
