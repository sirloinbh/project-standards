// Prints the CHANGELOG section of one package version (used in release notes and sync PR bodies).
// Usage: node scripts/changelog-section.mjs <package-folder> <version>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function changelogSection(text, version) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(`## ${version}`);
  if (start < 0) return null;
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [name, version] = process.argv.slice(2);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const section = changelogSection(fs.readFileSync(path.join(root, 'packages', name, 'CHANGELOG.md'), 'utf8'), version);
  if (section === null) {
    console.error(`packages/${name}/CHANGELOG.md has no "## ${version}" section`);
    process.exit(1);
  }
  console.log(section);
}
