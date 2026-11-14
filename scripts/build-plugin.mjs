// Generates the Claude Code plugin `sirloinbh-standards` and its marketplace file from the central sources (#515, ADR-0013).
// Usage: node scripts/build-plugin.mjs          write plugins/sirloinbh-standards/ and .claude-plugin/marketplace.json
//        node scripts/build-plugin.mjs --check  fail if the committed files differ from what this script would write
// The plugin is only for repos outside sync. Synced repos get the same skills and hooks as files and must not enable it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN_NAME = 'sirloinbh-standards';
export const PLUGIN_DIR = `plugins/${PLUGIN_NAME}`;
export const MARKETPLACE_FILE = '.claude-plugin/marketplace.json';
const SKILLS_SOURCE = 'templates/common/skills';
const HOOKS_SOURCE = 'templates/common/.claude/hooks';
const SETTINGS_SOURCE = 'templates/common/.claude/settings.json.tmpl';
const PROJECT_HOOKS = '${CLAUDE_PROJECT_DIR}/.claude/hooks/';
const PLUGIN_HOOKS = '${CLAUDE_PLUGIN_ROOT}/hooks/';

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

/** Replaces the project hook folder with the plugin hook folder in every string of the hooks block. */
export function rewriteHooks(value) {
  if (typeof value === 'string') return value.split(PROJECT_HOOKS).join(PLUGIN_HOOKS);
  if (Array.isArray(value)) return value.map(rewriteHooks);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteHooks(v)]));
  return value;
}

/** Returns Map<repo-relative path, string | Buffer> of every file the plugin and the marketplace consist of. */
export function buildPlugin(root) {
  const out = new Map();
  const skills = [];
  const skipped = [];
  const skillsDir = path.join(root, SKILLS_SOURCE);
  for (const name of fs.readdirSync(skillsDir).filter((n) => n.startsWith('std-')).sort()) {
    const dir = path.join(skillsDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8').includes('{{')) {
      skipped.push(name);
      continue;
    }
    skills.push(name);
    for (const file of listFiles(dir)) out.set(`${PLUGIN_DIR}/skills/${name}/${file}`, fs.readFileSync(path.join(dir, file)));
  }

  const hooksDir = path.join(root, HOOKS_SOURCE);
  const scripts = fs.readdirSync(hooksDir).filter((n) => n.endsWith('.mjs')).sort();
  for (const file of scripts) out.set(`${PLUGIN_DIR}/hooks/${file}`, fs.readFileSync(path.join(hooksDir, file)));

  const settings = JSON.parse(fs.readFileSync(path.join(root, SETTINGS_SOURCE), 'utf8'));
  out.set(`${PLUGIN_DIR}/hooks/hooks.json`, json({ hooks: rewriteHooks(settings.hooks) }));

  out.set(
    `${PLUGIN_DIR}/.claude-plugin/plugin.json`,
    json({
      name: PLUGIN_NAME,
      description: 'sirloinbh shared std skills and guard hooks, for repos outside file sync (ADR-0013).',
      author: { name: 'sirloinbh' },
    }),
  );
  out.set(
    MARKETPLACE_FILE,
    json({
      name: PLUGIN_NAME,
      owner: { name: 'sirloinbh' },
      description: 'sirloinbh shared std skills and guard hooks for repos outside file sync.',
      plugins: [{ name: PLUGIN_NAME, source: `./${PLUGIN_DIR}`, description: 'Shared std skills and guard hooks for repos outside sync.' }],
    }),
  );
  out.set(`${PLUGIN_DIR}/README.md`, renderReadme(skills, skipped, scripts));
  return out;
}

function renderReadme(skills, skipped, scripts) {
  return [
    '<!-- Generated file. Edit the sources in sirloinbh/project-standards and regenerate with `npm run plugin`. -->',
    '# sirloinbh-standards plugin',
    '',
    'The std skills and guard hooks of `sirloinbh/project-standards`, for repos that are **not** sync targets (`file-control`, `develop-skill`). Do not enable it in synced repos: they already have the same skills and hooks as files, and both copies would load (ADR-0013).',
    '',
    '## Install',
    '',
    '```',
    'claude plugin marketplace add sirloinbh/project-standards',
    'claude plugin install sirloinbh-standards@sirloinbh-standards --scope project',
    '```',
    '',
    '## Skills',
    '',
    ...skills.map((s) => `- \`/${PLUGIN_NAME}:${s}\``),
    '',
    '## Skipped skills',
    '',
    'These skills contain `{{` template variables that are filled in per repo, so they are not in the plugin.',
    '',
    ...(skipped.length ? skipped.map((s) => `- \`${s}\``) : ['- None']),
    '',
    '## Hooks',
    '',
    ...scripts.map((s) => `- \`hooks/${s}\``),
    '',
    '`hooks/hooks.json` is the `hooks` block of `templates/common/.claude/settings.json.tmpl`, with `${CLAUDE_PROJECT_DIR}/.claude/hooks/` rewritten to `${CLAUDE_PLUGIN_ROOT}/hooks/`.',
    '',
    'Permission rules, `AGENTS.md`, and `.claude/rules/` cannot ship in a plugin. Each repo keeps its own.',
    '',
  ].join('\n');
}

/** Returns the list of problems (empty when the committed files are current). */
export function checkPlugin(root) {
  const out = buildPlugin(root);
  const dir = path.join(root, PLUGIN_DIR);
  const existing = fs.existsSync(dir) ? listFiles(dir).map((f) => `${PLUGIN_DIR}/${f}`) : [];
  const problems = [];
  for (const f of existing) if (!out.has(f)) problems.push(`unexpected: ${f}`);
  for (const [f, content] of out) {
    const file = path.join(root, f);
    if (!fs.existsSync(file)) problems.push(`missing: ${f}`);
    else if (!fs.readFileSync(file).equals(Buffer.from(content))) problems.push(`stale: ${f}`);
  }
  return problems;
}

export function writePlugin(root) {
  const out = buildPlugin(root);
  fs.rmSync(path.join(root, PLUGIN_DIR), { recursive: true, force: true });
  for (const [f, content] of out) {
    const target = path.join(root, f);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return [...out.keys()];
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--check')) {
    const problems = checkPlugin(root);
    if (problems.length) {
      console.error(`The generated plugin is out of date. Run \`npm run plugin\` and commit the result.\n${problems.map((p) => `  ${p}`).join('\n')}`);
      process.exit(1);
    }
    console.log('plugin: up to date');
  } else {
    console.log(`plugin: wrote ${writePlugin(root).length} files`);
  }
}
