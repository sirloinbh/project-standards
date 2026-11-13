// Counts Korean (Hangul) text left in a repository: markdown files and code-comment lines (#493).
// Pure functions only: callers pass in file paths and a way to read them.
import { LEGACY_HEADER_TEXT } from './render.mjs';

const HANGUL = /[\uAC00-\uD7A3]/;

/**
 * Literals that must stay Korean because code matches on them (legacy header, pre-#455 sync commit prefix),
 * and the quoted legacy header name that AGENTS.md keeps so readers can recognise older managed files (#512).
 */
export const DEFAULT_ALLOW = [LEGACY_HEADER_TEXT, 'chore: 중앙 표준 동기화 (project-standards@', '"중앙 관리 파일"'];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '__snapshots__', 'snapshots', 'fixtures']);
const SKIP_FILES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|[^/]*\.lock|[^/]*\.snap)$/;
const MARKDOWN = /\.(md|mdx)$/i;

// Comment markers per file kind. A line counts as a comment line when a marker comes before the Hangul.
const SLASH = { exts: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'java', 'kt', 'go', 'rs', 'c', 'h', 'cpp', 'cs', 'swift', 'css', 'scss', 'sql'], marker: /(\/\/|\/\*|^\s*\*)/ };
const HASH = { exts: ['sh', 'bash', 'py', 'rb', 'yml', 'yaml', 'toml', 'tf', 'ps1', 'psm1', 'env', 'example', 'conf', 'ini'], marker: /#/ };
const HTML = { exts: ['html', 'htm', 'vue', 'svelte', 'xml', 'svg'], marker: /(<!--|\/\/|\/\*|^\s*\*)/ };
const KINDS = new Map([SLASH, HASH, HTML].flatMap((k) => k.exts.map((e) => [e, k.marker])));

const extOf = (file) => (/\.([A-Za-z0-9]+)$/.exec(file) ?? [])[1]?.toLowerCase() ?? (/(^|\/)Dockerfile[^/]*$/.test(file) ? 'sh' : '');

/** True when the path is skipped entirely (dependency, build output, lockfile, snapshot fixture). */
export function isSkipped(file) {
  const parts = file.split('/');
  return parts.slice(0, -1).some((d) => SKIP_DIRS.has(d)) || SKIP_FILES.test(file);
}

/** 'markdown', 'code', or null when the file is not scanned (binary or unknown type). */
export function fileKind(file) {
  if (isSkipped(file)) return null;
  if (MARKDOWN.test(file)) return 'markdown';
  return KINDS.has(extOf(file)) ? 'code' : null;
}

const strip = (line, allow) => allow.reduce((l, lit) => l.split(lit).join(''), line);

/** Counts Hangul lines in one file's text. Allowed literals are removed first. Returns { lines } (markdown) or { lines } of comments (code). */
export function countKoreanLines(file, text, allow = DEFAULT_ALLOW) {
  const kind = fileKind(file);
  if (!kind || text.includes('\0')) return 0;
  const marker = kind === 'code' ? KINDS.get(extOf(file)) : null;
  let count = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = strip(raw, allow);
    if (!HANGUL.test(line)) continue;
    if (kind === 'markdown') count++;
    else {
      const at = line.search(marker);
      if (at >= 0 && HANGUL.test(line.slice(at))) count++;
    }
  }
  return count;
}

/** Paths worth reading: markdown first, then code. */
export const scannable = (paths) => paths.filter((p) => fileKind(p)).sort((a, b) => Number(fileKind(a) === 'code') - Number(fileKind(b) === 'code'));

/**
 * Korean-text status for one repo. `files` is [{ path, text }]; `partial` marks a capped scan.
 * Returns { markdownFiles, commentLines, files: [path of each file with Korean], partial }.
 */
export function koreanStats(files, { allow = DEFAULT_ALLOW, partial = false } = {}) {
  const out = { markdownFiles: 0, commentLines: 0, files: [], partial };
  for (const { path: file, text } of files) {
    const n = countKoreanLines(file, text, allow);
    if (!n) continue;
    out.files.push(file);
    if (fileKind(file) === 'markdown') out.markdownFiles++;
    else out.commentLines += n;
  }
  return out;
}
