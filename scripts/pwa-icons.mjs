// Writes the placeholder app icons into an app's frontend/public folder (docs/pwa.md).
// Existing icons are kept unless --force is given.
// Usage: node scripts/pwa-icons.mjs --out <app>/frontend/public [--force]
import fs from 'node:fs';
import path from 'node:path';
import { renderIcons } from './lib/pwa-icons.mjs';

const flag = process.argv.indexOf('--out');
if (flag < 0 || !process.argv[flag + 1]) {
  console.error('Usage: node scripts/pwa-icons.mjs --out <app>/frontend/public [--force]');
  process.exit(2);
}
const out = path.resolve(process.argv[flag + 1]);
const force = process.argv.includes('--force');
for (const icon of renderIcons()) {
  const file = path.join(out, icon.path);
  if (fs.existsSync(file) && !force) {
    console.log(`kept     ${icon.path}`);
    continue;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, icon.content);
  console.log(`written  ${icon.path}`);
}
