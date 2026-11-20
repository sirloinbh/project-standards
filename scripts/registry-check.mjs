// Checks registry, versions, sync config, and templates/index.json against them. Exits 1 on any error.
// Usage: node scripts/registry-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexErrors } from './lib/index-check.mjs';
import { checkAll, loadAll } from './lib/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = loadAll(root);
const { errors, warnings } = checkAll(all);
if (!errors.length) {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8'));
  errors.push(...indexErrors(index, all.data.sync, all.schemas.projects));
}

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length) {
  console.error(`\nregistry-check: ${errors.length} error(s). Fix registry/, versions.json, sync.config.json, or templates/index.json.`);
  process.exit(1);
}
console.log('registry-check: ok');
