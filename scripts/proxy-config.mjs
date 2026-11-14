// Writes the server reverse proxy files (nginx, certbot, renewal timer) from the registry (#251).
// Usage: node scripts/proxy-config.mjs                          write to .local/proxy/
//        node scripts/proxy-config.mjs --out <folder>
//        node scripts/proxy-config.mjs --domain example.com     preview before rootDomain is set
// Copy the folder to /opt/project-standards/proxy on the server (docs/runbooks/proxy.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProxy } from './lib/proxy.mjs';
import { loadAll } from './lib/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function option(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

try {
  const out = path.resolve(option('--out') ?? path.join(root, '.local', 'proxy'));
  const files = renderProxy(loadAll(root).data, { domain: option('--domain') });
  for (const f of files) {
    const target = path.join(out, f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // The server reads these as Linux files.
    fs.writeFileSync(target, f.content.replace(/\r\n/g, '\n'));
  }
  console.log(`proxy-config: wrote ${files.length} files to ${out}`);
} catch (error) {
  console.error(`proxy-config: ${error.message}`);
  process.exit(1);
}
