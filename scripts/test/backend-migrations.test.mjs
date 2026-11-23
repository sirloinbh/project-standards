// Tests the managed migration runner templates/app/backend/src/standard/migrations.ts (#677): file rules, checksum and
// BOM handling, the order plan, the transaction and lock behavior, and files that cannot run in a transaction.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const { checksum, migrate, planMigrations, readMigrations, transactionProblem } = await import(
  '../../templates/app/backend/src/standard/migrations.ts'
);

const file = (name, sql = `-- ${name}`) => ({ name, sql, checksum: checksum(sql) });
const record = (m) => ({ name: m.name, checksum: m.checksum });
const BOM = String.fromCharCode(0xfeff);

async function withDir(files, run) {
  const dir = await mkdtemp(join(tmpdir(), 'migrations-'));
  try {
    for (const [name, sql] of Object.entries(files)) await writeFile(join(dir, name), sql);
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('checksum ignores line endings and a UTF-8 BOM but not content', () => {
  const lf = "CREATE TABLE a();\nINSERT INTO a VALUES ('note');\n";
  assert.equal(checksum(lf.replace(/\n/g, '\r\n')), checksum(lf));
  assert.equal(checksum(BOM + lf), checksum(lf));
  assert.notEqual(checksum(lf + '-- changed\n'), checksum(lf));
});

test('readMigrations rejects unexpected names and duplicate numbers, and ignores other files', async () => {
  await withDir({ '001_a.sql': '', 'extra.sql': '' }, async (dir) => {
    await assert.rejects(readMigrations(dir), /must look like NNN_name\.sql: extra\.sql/);
  });
  await withDir({ '001_a.sql': '', '001_b.sql': '' }, async (dir) => {
    await assert.rejects(readMigrations(dir), /share a number: 001_a\.sql, 001_b\.sql/);
  });
  await withDir({ '002_b.sql': 'b', '001_a.sql': 'a', 'notes.txt': '' }, async (dir) => {
    assert.deepEqual((await readMigrations(dir)).map((f) => f.name), ['001_a.sql', '002_b.sql']);
  });
});

test('readMigrations strips the BOM from the SQL it sends, with the same checksum', async () => {
  await withDir({ '001_a.sql': `${BOM}CREATE TABLE a();\r\n` }, async (dir) => {
    const [first] = await readMigrations(dir);
    assert.equal(first.sql, 'CREATE TABLE a();\r\n');
    assert.equal(first.checksum, checksum('CREATE TABLE a();\n'));
  });
});

test('readMigrations rejects a file that cannot run in a transaction and names it', async () => {
  for (const [sql, reason] of [
    ['CREATE INDEX CONCURRENTLY i ON t (c);', /CONCURRENTLY/],
    ['BEGIN;\nCREATE TABLE a();\nCOMMIT;', /transaction control/],
    ['VACUUM t;', /VACUUM/],
    ['CREATE DATABASE other;', /DATABASE/],
    ['ALTER SYSTEM SET work_mem = 1;', /ALTER SYSTEM/],
  ]) {
    await withDir({ '001_a.sql': 'CREATE TABLE a();', '002_bad.sql': sql }, async (dir) => {
      await assert.rejects(readMigrations(dir), (e) => e.message.startsWith('002_bad.sql cannot run') && reason.test(e.message));
    });
  }
});

test('the transaction check ignores keywords in comments and strings, and a CASE expression ending a line (#734)', () => {
  assert.equal(transactionProblem('ALTER TABLE t ADD CHECK (\n  CASE WHEN a THEN b\n  END\n);'), undefined);
  assert.equal(transactionProblem("-- CREATE INDEX CONCURRENTLY\nINSERT INTO t VALUES ('BEGIN; VACUUM');"), undefined);
  assert.equal(transactionProblem('/* VACUUM */ SELECT $f$ COMMIT; $f$;'), undefined);
  assert.equal(transactionProblem('CREATE TABLE a (begin_at date);'), undefined);
});

test('planMigrations returns only files after the applied history', () => {
  const files = [file('001_a.sql'), file('002_b.sql'), file('003_c.sql')];
  assert.deepEqual(planMigrations(files, []).pending.map((f) => f.name), ['001_a.sql', '002_b.sql', '003_c.sql']);
  const plan = planMigrations(files, files.slice(0, 2).map(record));
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.pending.map((f) => f.name), ['003_c.sql']);
});

test('planMigrations reports changed, missing and out-of-order files', () => {
  const files = [file('001_a.sql'), file('002_b.sql', 'edited'), file('004_d.sql')];
  const plan = planMigrations(files, [record(file('001_a.sql')), record(file('002_b.sql')), record(file('005_e.sql'))]);
  assert.deepEqual(plan.errors, [
    'An applied migration file was changed: 002_b.sql',
    'An applied migration file is missing: 005_e.sql',
    'A new file sorts before the applied 005_e.sql: 004_d.sql',
  ]);
});

// A fake connection that answers the runner's queries; `fail` decides which query throws.
function fakeDb(fail) {
  const queries = [];
  return {
    queries,
    db: {
      query: async (sql, values) => {
        queries.push([sql, values]);
        const error = fail(sql);
        if (error) throw error;
        return { rows: sql.includes('to_regclass') ? [{ found: false }] : [] };
      },
    },
  };
}

test('migrate locks with the given key, applies each file in a transaction, and unlocks', async () => {
  const ok = fakeDb(() => undefined);
  assert.deepEqual(await migrate(ok.db, [file('001_a.sql')], 581_004), ['001_a.sql']);
  const sqls = ok.queries.map(([sql]) => sql);
  assert.match(sqls[0], /pg_advisory_lock/);
  assert.deepEqual(ok.queries[0][1], [581_004]);
  const at = (sql) => sqls.findIndex((text) => text.startsWith(sql));
  assert.ok(at('BEGIN') < at('-- 001_a.sql') && at('-- 001_a.sql') < at('INSERT INTO schema_migrations') && at('INSERT INTO schema_migrations') < at('COMMIT'));
  assert.match(sqls.at(-1), /pg_advisory_unlock/);
  assert.deepEqual(ok.queries.at(-1)[1], [581_004]);
});

test('migrate keeps the failing file and cause when the connection is lost', async () => {
  let lost = false;
  const lostError = () => new Error('Connection terminated unexpectedly');
  const { db } = fakeDb((sql) => {
    if (lost) return lostError();
    if (sql === '-- 002_b.sql') {
      lost = true;
      return lostError();
    }
    return undefined;
  });
  await assert.rejects(
    migrate(db, [file('001_a.sql'), file('002_b.sql')], 1),
    (e) => e.message === '002_b.sql failed to apply: Connection terminated unexpectedly',
  );
});

test('migrate still returns the applied files when the final unlock fails, and logs one line (#1002)', async (t) => {
  const lines = [];
  t.mock.method(console, 'error', (line) => lines.push(line));
  const unlockFails = fakeDb((sql) => (sql.includes('pg_advisory_unlock') ? new Error('unlock failed') : undefined));
  assert.deepEqual(await migrate(unlockFails.db, [file('001_a.sql')], 1), ['001_a.sql']);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /unlock failed/);
  assert.doesNotMatch(lines[0], /\n/);
});

// Runs the rendered CLI (migrate.ts.tmpl) against a stub `pg` whose connect() rejects, as a stopped database does.
test('the migration CLI prints one line and exits 1 when it cannot connect (#1002)', async () => {
  const { readFile, mkdir, copyFile } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const src = new URL('../../templates/app/backend/src/standard/', import.meta.url);
  const dir = await mkdtemp(join(tmpdir(), 'migrate-cli-'));
  try {
    await mkdir(join(dir, 'node_modules', 'pg'), { recursive: true });
    await writeFile(join(dir, 'node_modules', 'pg', 'package.json'), '{"name":"pg","main":"index.js"}');
    await writeFile(
      join(dir, 'node_modules', 'pg', 'index.js'),
      `exports.Client = class { async connect() { throw new Error('connect ECONNREFUSED 127.0.0.1:5432', { cause: new Error('refused by the stub') }); } async end() { throw new Error('Client was closed and is not queryable'); } };`,
    );
    await mkdir(join(dir, 'standard'));
    await copyFile(new URL('migrations.ts', src), join(dir, 'standard', 'migrations.ts'));
    const cli = (await readFile(new URL('migrate.ts.tmpl', src), 'utf8')).replace('{{project.slot}}', '4').replace("'./migrations.js'", "'./migrations.ts'");
    await writeFile(join(dir, 'standard', 'migrate.ts'), cli);
    const run = spawnSync(process.execPath, [join(dir, 'standard', 'migrate.ts')], {
      env: { ...process.env, DATABASE_URL: 'postgres://nobody@127.0.0.1:1/none' },
      encoding: 'utf8',
    });
    assert.equal(run.status, 1, run.stderr);
    assert.equal(run.stdout, '');
    const lines = run.stderr.split('\n').filter((line) => line && !line.includes('ExperimentalWarning'));
    assert.equal(lines.length, 1, run.stderr);
    assert.equal(lines[0], 'connect ECONNREFUSED 127.0.0.1:5432 (refused by the stub)');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the managed files contain no irregular whitespace, which the apps lint rejects (#739)', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const name of ['migrations.ts', 'migrate.ts.tmpl']) {
    const text = await readFile(new URL(`../../templates/app/backend/src/standard/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /[\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/, name);
  }
});
