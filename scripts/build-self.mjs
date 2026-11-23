// Generates this repo's own copies of the shared skills, hooks, Codex files, GitHub templates, and editor config from templates/common/ (#702, #951).
// Usage: node scripts/build-self.mjs          write the copies
//        node scripts/build-self.mjs --check  fail if a copy differs from its source
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const C = 'templates/common';
// [source, target]. A directory is mirrored (extra files in the target are reported); a file is copied as is.
export const SELF_COPIES = [
  [`${C}/skills`, '.claude/skills'],
  [`${C}/.claude/hooks`, '.claude/hooks'],
  [`${C}/.claude/settings.json.tmpl`, '.claude/settings.json'],
  [`${C}/.codex/rules`, '.codex/rules'],
  [`${C}/.codex/hooks.json.tmpl`, '.codex/hooks.json'],
  [`${C}/.github/ISSUE_TEMPLATE`, '.github/ISSUE_TEMPLATE'],
  [`${C}/.github/pull_request_template.md`, '.github/pull_request_template.md'],
  // .gitattributes is not copied: this repo adds `*.cmd text eol=crlf` for tools/**/*.cmd, which the template does not need (#951).
  [`${C}/.editorconfig.tmpl`, '.editorconfig'],
  [`${C}/.vscode/settings.json.tmpl`, '.vscode/settings.json'],
];

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

/** Skill folders whose SKILL.md has `{{` variables are filled in per repo, so this repo has no plain copy of them. */
function isTemplatedSkill(root, src, file) {
  if (!src.endsWith('/skills')) return false;
  const skill = file.split('/')[0];
  return fs.readFileSync(path.join(root, src, skill, 'SKILL.md'), 'utf8').includes('{{');
}

/** Returns Map<repo-relative target path, Buffer> and the list of directory targets that are mirrored. */
export function buildSelf(root) {
  const out = new Map();
  const dirs = [];
  for (const [src, dst] of SELF_COPIES) {
    const full = path.join(root, src);
    if (fs.statSync(full).isDirectory()) {
      dirs.push(dst);
      for (const f of listFiles(full)) if (!isTemplatedSkill(root, src, f)) out.set(`${dst}/${f}`, fs.readFileSync(path.join(full, f)));
    } else {
      out.set(dst, fs.readFileSync(full));
    }
  }
  return { out, dirs };
}

/** Returns the list of problems (empty when every copy is current). */
export function checkSelf(root) {
  const { out, dirs } = buildSelf(root);
  const problems = [];
  for (const d of dirs) {
    for (const f of listFiles(path.join(root, d))) if (!out.has(`${d}/${f}`)) problems.push(`unexpected: ${d}/${f}`);
  }
  for (const [f, content] of out) {
    const file = path.join(root, f);
    if (!fs.existsSync(file)) problems.push(`missing: ${f}`);
    else if (!fs.readFileSync(file).equals(content)) problems.push(`stale: ${f}`);
  }
  return problems;
}

export function writeSelf(root) {
  const { out, dirs } = buildSelf(root);
  for (const d of dirs) {
    for (const f of listFiles(path.join(root, d))) if (!out.has(`${d}/${f}`)) fs.rmSync(path.join(root, d, f));
  }
  for (const [f, content] of out) {
    const target = path.join(root, f);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return [...out.keys()];
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--check')) {
    const problems = checkSelf(root);
    if (problems.length) {
      console.error(`This repo's own copies are out of date. Run \`npm run self\` and commit the result.\n${problems.map((p) => `  ${p}`).join('\n')}`);
      process.exit(1);
    }
    console.log('self: up to date');
  } else {
    console.log(`self: wrote ${writeSelf(root).length} files`);
  }
}
