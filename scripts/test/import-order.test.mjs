// The apps lint with simple-import-sort (@sirloinbh/eslint-config). Managed TypeScript is copied into every app, so
// one unsorted import fails lint in every sync PR (number-input.tsx did, after its imports were moved). This repo does
// not install ESLint, so this reads the leading imports of the managed and scaffold files and checks the two things
// that went wrong before: `node:` imports come before packages and packages before relative imports, and each group is in alphabetical order (`../` before
// `./`). It is a guard, not a copy of the rule: for the exact rule run ESLint in an app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sources(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(full));
    else if (/\.(ts|tsx|ts\.tmpl|tsx\.tmpl)$/.test(entry.name)) found.push(full);
  }
  return found;
}

/** The module specifiers of the import statements at the top of a file, in order, with side-effect imports left out. */
export function leadingImports(text) {
  const found = [];
  const pattern = /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"];?[^\S\n]*$/;
  let statement = '';
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!statement && (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'))) continue;
    statement += (statement ? '\n' : '') + line;
    if (/\bfrom\s+['"][^'"]+['"];?\s*$/.test(line) || /^\s*import\s+['"][^'"]+['"];?\s*$/.test(line)) {
      const sideEffect = /^\s*import\s+['"][^'"]+['"];?\s*$/.test(statement);
      const match = statement.replace(/\n/g, ' ').match(/from\s+['"]([^'"]+)['"]/);
      if (!sideEffect && match) found.push(match[1]);
      statement = '';
    } else if (!/^\s*import\b/.test(statement) && !statement.includes('from')) {
      break; // the first line that is not an import
    }
  }
  void pattern;
  return found;
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const relativeRank = (source) => (source.startsWith('.') ? -(source.match(/\.\.\//g) ?? []).length : 1);

const groupOf = (specifier) => (specifier.startsWith('node:') ? 0 : specifier.startsWith('.') ? 2 : 1);
const groupNames = ['node: import', 'package import', 'relative import'];

/** Why the imports are out of order, or undefined when they are fine. */
export function importOrderProblem(specifiers) {
  for (let i = 1; i < specifiers.length; i++) {
    const [a, b] = [specifiers[i - 1], specifiers[i]];
    if (groupOf(a) > groupOf(b)) return `a ${groupNames[groupOf(b)]} (${b}) comes after a ${groupNames[groupOf(a)]} (${a})`;
    if (groupOf(a) === groupOf(b)) {
      const order = groupOf(a) === 2 ? relativeRank(a) - relativeRank(b) || collator.compare(a, b) : collator.compare(a, b);
      if (order > 0) return `${b} should come before ${a}`;
    }
  }
  return undefined;
}

test('no managed or scaffold TypeScript has unsorted leading imports', () => {
  const problems = [];
  for (const folder of ['templates', 'scaffold']) {
    for (const file of sources(path.join(root, folder))) {
      const problem = importOrderProblem(leadingImports(fs.readFileSync(file, 'utf8')));
      if (problem) problems.push(`${path.relative(root, file).replaceAll('\\', '/')}: ${problem}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the check sees the order that failed lint in number-input.tsx', () => {
  const broken = ["import { MinusIcon } from 'lucide-react';", "import { cn } from '../../lib/utils';", "import { stepValue } from './number-step';", "import { Button } from './button';"].join('\n');
  assert.equal(importOrderProblem(leadingImports(broken)), './button should come before ./number-step');
  assert.equal(importOrderProblem(['react', '../../lib/utils', './button', './number-step']), undefined);
  assert.match(importOrderProblem(['./button', 'react']), /^a package import \(react\) comes after a relative import/);
  assert.equal(importOrderProblem(['node:test', 'express', './app']), undefined);
  assert.match(importOrderProblem(['express', 'node:test']), /node: import/);
  assert.equal(importOrderProblem(['./a', '../b']), '../b should come before ./a');
  assert.deepEqual(leadingImports("import './index.css';\n\nimport { createRoot } from 'react-dom/client';\n\nimport { App } from './app';\n\ncreateRoot();"), ['react-dom/client', './app']);
});
