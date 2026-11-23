// Quarterly restore drill (#1059): opens one checklist issue that proves the newest S3 copy of every database can be
// downloaded and restored. The weekly restore check (backup.sh verify) only restores the newest local dump.
// Read-only unless --apply. Node built-ins only; --apply uses the gh CLI of the workflow runner.
// Usage: node scripts/restore-drill.mjs [--date YYYY-MM-DD] [--dry-run | --apply] [--repo owner/name]
//   --dry-run  (default) prints the title and the body
//   --apply    creates the issue unless one with the same title already exists (so a re-run does nothing)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** "2026-Q4" for a YYYY-MM-DD date. */
export function quarterOf(date) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) throw new Error(`date must be YYYY-MM-DD, got ${date}`);
  return `${match[1]}-Q${Math.ceil(Number(match[2]) / 3)}`;
}

/** Every app and shared service that has a database: [{ name, db }], in registry order. */
export function databasesOf(registry) {
  return [...(registry.projects ?? []), ...(registry.sharedServices ?? [])].filter((p) => p.db?.name).map((p) => ({ name: p.name, db: p.db.name }));
}

/** Issue title and body for one quarter. */
export function buildDrill(registry, date, { postgresImage = 'postgres:17-alpine' } = {}) {
  const quarter = quarterOf(date);
  const items = databasesOf(registry);
  if (!items.length) throw new Error('the registry lists no database');
  const checklist = items
    .map(
      (i) =>
        `- [ ] **${i.name}**: newest \`${i.db}-*.sql.gz\` and its \`.counts\` file under \`s3://<bucket>/${i.name}/\`. Dump: \`__\`. Restore time: \`__ min\`. Tables compared: \`__\`. Result: \`__\``,
    )
    .join('\n');
  const body = `## Summary
Quarterly restore drill ${quarter}: prove that the newest off-server (S3) copy of each database can be downloaded and restored, and that the restored row counts match the count file saved with the dump.

## Why
The weekly restore check restores the newest **local** dump. Nothing else checks the S3 copy or runs the manual restore steps of [docs/runbooks/backup-restore.md](https://github.com/sirloinbh/project-standards/blob/main/docs/runbooks/backup-restore.md) on a schedule.

## Tasks
Steps for each item below (runbook section "Quarterly drill"; this is a user step because it uses the personal AWS profile):
1. List \`s3://<bucket>/<name>/\` with the personal profile and pick the newest \`.sql.gz\`; download it and the \`.counts\` file with the same name.
2. Start a scratch database: \`docker run -d --rm --name drill-<name> -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=restore_check ${postgresImage}\`.
3. Restore: \`gunzip -c <file> | docker exec -i drill-<name> psql -q -v ON_ERROR_STOP=1 -U postgres -d restore_check\`. Note the time taken.
4. Compare the row counts with the count file (the runbook has the query), then \`docker rm -f drill-<name>\`.
5. Write the result on the item. If a step in the runbook was wrong or missing, fix the runbook in the same sitting.

${checklist}

## Done when
- [ ] Every item above has a result, or a reason it was skipped
- [ ] Any failure has its own issue; the runbook is corrected where a step was wrong
- [ ] Close this issue

## Notes
- Opened by the \`restore-drill\` workflow on ${date}. Files with personal data stay on the PC and are deleted after the drill.
- Never paste a dump, a count file, or an access key into this issue.
`;
  return { title: `Quarterly restore drill ${quarter}`, body };
}

function gh(args, input) {
  const result = spawnSync('gh', args, { encoding: 'utf8', input });
  if (result.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

/** Creates the issue unless an issue with this exact title exists. Returns { created, url }. */
export function apply({ title, body }, repo, run = gh) {
  const found = JSON.parse(run(['issue', 'list', '--repo', repo, '--state', 'all', '--search', `"${title}" in:title`, '--json', 'number,title,url']) || '[]');
  const same = found.find((i) => i.title === title);
  if (same) return { created: false, url: same.url };
  const url = run(['issue', 'create', '--repo', repo, '--title', title, '--body-file', '-', '--label', 'type/chore,area/deploy,priority/P4,needs-user'], body).trim();
  return { created: true, url };
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const args = process.argv.slice(2);
    const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
    const date = value('--date') ?? new Date().toISOString().slice(0, 10);
    const registry = JSON.parse(fs.readFileSync(path.join(root, 'registry/projects.json'), 'utf8'));
    const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
    const drill = buildDrill(registry, date, { postgresImage: versions.images?.postgres });
    if (args.includes('--apply')) {
      const repo = value('--repo') ?? process.env.GITHUB_REPOSITORY;
      if (!repo) throw new Error('--apply needs --repo or GITHUB_REPOSITORY');
      const result = apply(drill, repo);
      console.log(result.created ? `restore-drill: opened ${result.url}` : `restore-drill: ${drill.title} already exists (${result.url}), nothing to do`);
    } else {
      console.log(`${drill.title}\n\n${drill.body}`);
    }
  } catch (error) {
    console.error(`restore-drill: ${error.message}`);
    process.exit(1);
  }
}
