import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { hasHeader } from '../lib/render.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const render = (project) => {
  const target = data.sync.targets.find((t) => t.project === project);
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
};
const withoutHeader = (text) => text.split('\n').filter((l) => !hasHeader(l)).join('\n');
const study = render('study-log');

test('push-repositories pushes the three subtree repositories named in the registry', () => {
  const text = study['scripts/push-repositories.ps1'];
  assert.match(text, /\$repos = @\{ frontend='study-log-frontend'; backend='study-log-backend'; database='study-log-db' \}/);
  assert.doesNotMatch(text, /infrastructure/, 'shared-aws-infrastructure is its own source repository now (#93, #94)');
  assert.match(render('dev-career-portfolio')['scripts/push-repositories.ps1'], /database='dev-career-portfolio-db'/);
});

test('push-repositories never pushes the umbrella main, never rejoins, and checks the sub-repo remotes first (#640)', () => {
  const apps = data.sync.targets.filter((t) => t.profile === 'app');
  assert.ok(apps.length >= 8);
  for (const t of apps) {
    const text = render(t.project)['scripts/push-repositories.ps1'];
    const code = text.split('\n').filter((l) => !l.startsWith('#')).join('\n');
    assert.doesNotMatch(code, /push origin main/, t.project);
    assert.doesNotMatch(code, /git push origin/, t.project);
    assert.doesNotMatch(code, /--rejoin/, t.project);
    assert.match(text, /git remote get-url/, t.project);
    assert.match(text, /git remote add \$part https:\/\/github\.com\/sirloinbh\//, t.project);
    assert.match(text, /git branch --delete --force \$branch/, t.project);
    assert.match(text, /^[\x20-\x7e\r\n]*$/, `${t.project}: ASCII only (#214)`);
  }
});

test('backup copies the dump file out of the container instead of capturing stdout (Korean text safety)', () => {
  const text = study['scripts/backup.ps1'];
  assert.match(text, /\("study-log-" \+ \(Get-Date/);
  assert.match(text, /\$tmp = '\/tmp\/study-log-backup\.sql'/);
  assert.match(text, /& docker compose cp "db:\$tmp" \$backupPath/);
  assert.doesNotMatch(text, /\$dump = /, 'no stdout capture');
  assert.match(study['.gitignore'], /^backups\/$/m, 'backups stay out of Git');
});

test('shared scripts are copied unchanged apart from the managed header', () => {
  for (const file of ['scripts/gh-project.ps1', 'scripts/claude-skills.mjs']) {
    // *.ps1 is checked out with CRLF (.gitattributes); rendering works in LF, so compare in LF.
    const source = fs.readFileSync(path.join(root, 'templates/app', file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(withoutHeader(study[file]), source, file);
    assert.ok(hasHeader(study[file]), `${file} has the managed header`);
  }
});

test('rendered PowerShell scripts are ASCII only (Windows PowerShell 5.1 reads them as ANSI)', () => {
  const scripts = Object.keys(study).filter((file) => file.endsWith('.ps1'));
  assert.ok(scripts.length > 0);
  for (const file of scripts) {
    const bad = [...study[file]].find((ch) => ch.charCodeAt(0) > 0x7f);
    assert.equal(bad, undefined, `${file} must stay ASCII-only`);
  }
});
