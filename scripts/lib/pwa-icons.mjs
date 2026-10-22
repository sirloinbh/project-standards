// Placeholder app icons for the web app manifest, drawn and PNG-encoded with Node built-ins only.
// Every app starts with the same neutral mark (docs/pwa.md explains how to replace it).
import zlib from 'node:zlib';

/** Icon files under frontend/public/. The maskable icon keeps its mark inside the central 80% safe zone. */
export const ICONS = [
  { path: 'icons/icon-192.png', size: 192 },
  { path: 'icons/icon-512.png', size: 512 },
  { path: 'icons/maskable-512.png', size: 512 },
  { path: 'icons/apple-touch-icon.png', size: 180 },
];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])));
  return Buffer.concat([head, data, crc]);
}

/** Encodes 8-bit RGBA pixels (width × height × 4 bytes) as a PNG file. */
export function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // bit depth 8, colour type RGBA, default compression/filter/interlace
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The placeholder mark: a white ring on a full-bleed near-black square (the dark background token).
 * The ring stays inside 60% of the width, so the same drawing is safe as a maskable icon.
 */
export function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const outer = size * 0.3;
  const inner = size * 0.19;
  const samples = 4; // 4×4 supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const dx = x + (sx + 0.5) / samples - size / 2;
          const dy = y + (sy + 0.5) / samples - size / 2;
          const d = Math.hypot(dx, dy);
          if (d <= outer && d >= inner) hits++;
        }
      }
      const t = hits / (samples * samples);
      const v = Math.round(10 + (255 - 10) * t); // #0a0a0a → #ffffff
      rgba.set([v, v, v, 255], (y * size + x) * 4);
    }
  }
  return encodePng(size, size, rgba);
}

/** Returns [{ path, content: Buffer }] for every icon in ICONS. */
export const renderIcons = () => ICONS.map(({ path, size }) => ({ path, content: renderIcon(size) }));
