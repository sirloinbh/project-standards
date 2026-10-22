import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { ICONS, renderIcon } from '../lib/pwa-icons.mjs';
import { loadAll } from '../lib/registry.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const { data } = loadAll(root);
const render = (project) => {
  const vars = buildVars(data, data.sync.targets.find((t) => t.project === project), { centralSha: 'a'.repeat(40) });
  return Object.fromEntries(renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars }).map((f) => [f.path, f.content]));
};
const study = render('study-log');

/** Reads width, height and the RGBA pixels of a PNG written by encodePng. */
function decodePng(png) {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idatLength = png.readUInt32BE(33);
  const rows = zlib.inflateSync(png.subarray(41, 41 + idatLength));
  const pixel = (x, y) => [...rows.subarray(y * (width * 4 + 1) + 1 + x * 4, y * (width * 4 + 1) + 5 + x * 4)];
  return { width, height, pixel };
}

test('the manifest makes every app installable with its registry name', () => {
  for (const project of data.projects.projects) {
    const manifest = JSON.parse(render(project.name)['frontend/public/manifest.webmanifest']);
    assert.equal(manifest.name, project.displayName);
    assert.equal(manifest.short_name, project.title);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
    assert.ok(sizes.includes('192x192:any') && sizes.includes('512x512:any') && sizes.includes('512x512:maskable'));
    for (const icon of manifest.icons) assert.ok(ICONS.some((i) => `/${i.path}` === icon.src && `${i.size}x${i.size}` === icon.sizes), icon.src);
  }
});

test('manifest and theme colours are the light background token (ADR-0008)', () => {
  const tokens = fs.readFileSync(path.join(root, 'packages/design-tokens/tokens.css'), 'utf8');
  assert.match(tokens, /:root \{[^}]*--background: oklch\(1 0 0\);/);
  assert.match(tokens, /\.dark \{[^}]*--background: oklch\(0\.145 0 0\);/);
  const manifest = JSON.parse(study['frontend/public/manifest.webmanifest']);
  assert.equal(manifest.theme_color, '#ffffff');
  assert.equal(manifest.background_color, '#ffffff');
  assert.match(study['frontend/public/offline.html'], /content="#0a0a0a" media="\(prefers-color-scheme: dark\)"/);
});

test('the service worker parses and never caches the API or pages', () => {
  const sw = study['frontend/public/sw.js'];
  assert.doesNotThrow(() => new vm.Script(sw));
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)\) return;/);
  assert.match(sw, /request\.mode === 'navigate'\) event\.respondWith\(networkOrOffline\(request\)\)/);
  assert.match(sw, /cache\.add\(OFFLINE\)/);
});

test('nginx revalidates the service worker, manifest and pages, keeps hashed assets, and keeps security headers everywhere', () => {
  const conf = study['frontend/nginx.conf'];
  assert.match(conf, /location \/assets\/ \{\s*add_header Cache-Control "public, max-age=31536000, immutable" always;/);
  assert.match(conf, /location ~ \^\/\(sw\\\.js\|manifest\\\.webmanifest\)\$ \{\s*add_header Cache-Control "no-cache" always;/);
  // Each location with its own add_header must repeat the security headers; /api/ inherits the server-level ones.
  const blocks = conf.match(/location [^{]+\{[^}]*add_header[^}]*\}/g);
  assert.equal(blocks.length, 3);
  for (const block of blocks) {
    assert.match(block, /X-Content-Type-Options nosniff always/);
    assert.match(block, /Referrer-Policy same-origin always/);
  }
  assert.match(conf, /\n  add_header X-Content-Type-Options nosniff always;\n  add_header Referrer-Policy same-origin always;\n\}\n$/);
});

test('placeholder icons are valid PNGs, full-bleed, with the mark inside the maskable safe zone', () => {
  for (const { size } of ICONS) {
    const { width, height, pixel } = decodePng(renderIcon(size));
    assert.deepEqual([width, height], [size, size]);
    assert.deepEqual(pixel(0, 0), [10, 10, 10, 255]); // corner: background
    assert.deepEqual(pixel(Math.floor(size / 2), Math.floor(size / 2)), [10, 10, 10, 255]); // ring centre is empty
    assert.deepEqual(pixel(Math.floor(size * 0.25), Math.floor(size / 2)), [255, 255, 255, 255]); // on the ring
    // Nothing but background outside the central 80% circle (maskable safe zone).
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2;
      if (Math.abs(dx) > size * 0.4) assert.deepEqual(pixel(x, Math.floor(size / 2)), [10, 10, 10, 255]);
    }
  }
});
