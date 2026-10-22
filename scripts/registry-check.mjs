// Checks registry, versions, and sync config. Exits 1 on any error.
// Usage: node scripts/registry-check.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAll, loadAll } from './lib/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { errors, warnings } = checkAll(loadAll(root));

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length) {
  console.error(`\nregistry-check: ${errors.length} error(s). Fix registry/, versions.json, or sync.config.json.`);
  process.exit(1);
}
console.log('registry-check: ok');
