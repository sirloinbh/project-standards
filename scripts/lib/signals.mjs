// The server-wide AWS alert emitter (#1091): scripts/lib/signals.sh with the shared server .env path filled in.
// proxy.mjs adds it to the proxy files, next to public-check.sh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = path.join(path.dirname(fileURLToPath(import.meta.url)), 'signals.sh');

/** The text of signals.sh for a server whose shared environment file is `sharedEnv`. Linux line endings. */
export function signalsScript(sharedEnv) {
  return fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n').replaceAll('__SHARED_ENV__', sharedEnv);
}
