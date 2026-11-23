// Checks relative links and #anchors in the repository's Markdown files (#1061). Read-only, Node built-ins only.
// A link fails when its target file or directory is missing, or when `#anchor` matches no heading in the target.
// Not scanned: templates/ and scaffold/ (their links resolve in the repository that receives the file) and
// docs/daily/ (dated session notes that also point at files outside this repository).
// Ignored: links with a scheme (https:, mailto:, ...), links inside code blocks and inline code, and
// placeholders such as {{name}} or ${name}. Only `*.md` files are scanned, so `.tmpl` files are never checked.
// Usage: node scripts/check-doc-links.mjs [--root <repository>]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_PREFIXES = ['templates/', 'scaffold/', 'docs/daily/'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.local', 'dist', '.terraform', 'coverage', 'playwright-report', 'test-results']);

function walk(root, dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(root, path.join(dir, entry.name), out);
    } else if (entry.isFile()) out.push(path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'));
  }
  return out;
}

/** Tracked Markdown files when the folder is a git repository, otherwise every Markdown file outside skipped folders. */
export function listMarkdown(root) {
  let files = null;
  if (fs.existsSync(path.join(root, '.git'))) {
    const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 });
    if (result.status === 0) files = result.stdout.split('\0').filter(Boolean);
  }
  return (files ?? walk(root)).filter((file) => file.endsWith('.md') && !SKIP_PREFIXES.some((prefix) => file.startsWith(prefix)) && fs.existsSync(path.join(root, file)));
}

/** Removes fenced code blocks and HTML comments (lines are blanked so line numbers stay correct). */
function blankFences(text) {
  const out = [];
  text = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ''));
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (match && match[1][0] === fence[0] && match[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(line)) fence = null;
      out.push('');
    } else if (match) {
      fence = match[1];
      out.push('');
    } else out.push(line);
  }
  return out;
}

const stripInlineCode = (line) => line.replace(/(`+)[^`]*?\1/g, (m) => ' '.repeat(m.length));

/** GitHub heading slug: lowercase, drop punctuation except hyphen, underscore and space, spaces become hyphens. */
export function slugify(heading) {
  return heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*~]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '')
    .replace(/ /g, '-');
}

/** Anchors a Markdown text provides: heading slugs (duplicates get -1, -2, ...) and explicit id/name attributes. */
export function anchorsOf(text) {
  const anchors = new Set();
  const counts = new Map();
  for (const line of blankFences(text)) {
    const heading = /^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if (heading) {
      const slug = slugify(heading[1]);
      const n = counts.get(slug) ?? 0;
      counts.set(slug, n + 1);
      anchors.add(n === 0 ? slug : `${slug}-${n}`);
    }
    for (const m of line.matchAll(/<a\s[^>]*?(?:id|name)=["']([^"']+)["']/gi)) anchors.add(m[1]);
  }
  return anchors;
}

/** Links in one Markdown text: [{ line, target }]. Inline links, images and reference definitions. */
export function linksOf(text) {
  const links = [];
  blankFences(text).forEach((raw, index) => {
    const line = stripInlineCode(raw);
    for (const m of line.matchAll(/!?\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>]*>|[^\s)]*(?:\([^\s)]*\)[^\s)]*)*)/g)) {
      links.push({ line: index + 1, target: m[1].replace(/^<|>$/g, '') });
    }
    const def = /^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/.exec(line);
    if (def) links.push({ line: index + 1, target: def[1].replace(/^<|>$/g, '') });
  });
  return links;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const PLACEHOLDER = /\{\{|\}\}|\$\{|<%|%>|\[[A-Za-z_-]+\]$/;

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Returns human-readable error strings for the Markdown files under root. */
export function check(root) {
  const errors = [];
  const anchorCache = new Map();
  const anchorsFor = (rel) => {
    if (!anchorCache.has(rel)) anchorCache.set(rel, anchorsOf(fs.readFileSync(path.join(root, rel), 'utf8')));
    return anchorCache.get(rel);
  };
  for (const file of listMarkdown(root)) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const { line, target } of linksOf(text)) {
      if (!target || SCHEME.test(target) || target.startsWith('//') || PLACEHOLDER.test(target)) continue;
      const hash = target.indexOf('#');
      const pathPart = decode(hash === -1 ? target : target.slice(0, hash)).split('?')[0];
      const anchor = hash === -1 ? '' : decode(target.slice(hash + 1));
      const resolved = pathPart === '' ? file : path.posix.normalize(pathPart.startsWith('/') ? pathPart.slice(1) : path.posix.join(path.posix.dirname(file), pathPart));
      if (resolved.startsWith('..')) {
        errors.push(`${file}:${line}: link ${target} points outside the repository`);
        continue;
      }
      const absolute = path.join(root, resolved);
      const stat = fs.statSync(absolute, { throwIfNoEntry: false });
      if (!stat) {
        errors.push(`${file}:${line}: link ${target} points to a missing file (${resolved})`);
        continue;
      }
      if (anchor && stat.isFile() && resolved.endsWith('.md') && !anchorsFor(resolved).has(anchor.toLowerCase())) {
        errors.push(`${file}:${line}: link ${target} points to a missing heading #${anchor} in ${resolved}`);
      }
    }
  }
  return errors;
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const flag = process.argv.indexOf('--root');
  const root = flag > 0 ? path.resolve(process.argv[flag + 1]) : process.cwd();
  try {
    const errors = check(root);
    for (const e of errors) console.error(`✗ ${e}`);
    if (errors.length) {
      console.error(`\ncheck-doc-links: ${errors.length} broken link(s). Fix the link, or the file name or heading it points to.`);
      process.exit(1);
    }
    console.log('check-doc-links: all relative links and anchors resolve');
  } catch (error) {
    console.error(`check-doc-links: ${error.message}`);
    process.exit(2);
  }
}
