// Checks GitHub Actions workflow files without external tools:
// every `uses:` is pinned to a commit SHA listed in versions.json, and every workflow
// declares top-level permissions. Covers .github/workflows/ and workflow templates.
// Usage: node scripts/check-workflows.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function workflowFiles(root) {
  const out = [];
  const visit = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) visit(full);
      else if (/\.ya?ml(\.tmpl)?$/.test(e.name) && full.split(path.sep).join('/').includes('.github/workflows')) out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  visit(path.join(root, '.github'));
  visit(path.join(root, 'templates'));
  return out.sort();
}

/** Returns problems for one workflow text. `actions` is versions.json "actions". */
export function checkWorkflow(file, text, actions) {
  const problems = [];
  const pinned = new Map(Object.values(actions).map((a) => [a.repo, a]));
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    const m = /^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s*#\s*(\S+))?/.exec(line);
    if (!m) continue;
    const [, ref, comment] = m;
    const where = `${file}:${i + 1}`;
    if (ref.startsWith('./') || ref.startsWith('sirloinbh/project-standards/')) continue; // local or central reusable workflow
    const [repo, version] = ref.split('@');
    const expected = pinned.get(repo);
    if (!expected) problems.push(`${where}: ${repo} is not listed in versions.json actions`);
    else if (version !== expected.sha) problems.push(`${where}: ${repo} must be pinned to ${expected.sha} (${expected.version}), got ${version}`);
    else if (comment !== expected.version) problems.push(`${where}: add the version comment "# ${expected.version}"`);
  }
  if (!/^permissions:/m.test(text)) problems.push(`${file}: top-level permissions are missing`);
  return problems;
}

export function checkAll(root) {
  const { actions } = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
  return workflowFiles(root).flatMap((file) => checkWorkflow(file, fs.readFileSync(path.join(root, file), 'utf8'), actions));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const problems = checkAll(root);
  for (const p of problems) console.error(`error: ${p}`);
  if (problems.length) process.exit(1);
  console.log(`check-workflows: ok (${workflowFiles(root).length} files)`);
}
