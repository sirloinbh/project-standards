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

test('the transaction check ignores keywords in comments and strings', () => {
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

test('migrate reports an unlock failure after success', async () => {
  const unlockFails = fakeDb((sql) => (sql.includes('pg_advisory_unlock') ? new Error('unlock failed') : undefined));
  await assert.rejects(migrate(unlockFails.db, [file('001_a.sql')], 1), /unlock failed/);
});
