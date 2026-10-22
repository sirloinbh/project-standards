// Applies database/migrations/NNN_<name>.sql in file name order and records each file in
// schema_migrations. One file and its record commit together; an advisory lock keeps runs serial.
// Starter runner for new projects; the shared runner and its rules come from the central repository (#27).
// Usage: npm run db:migrate [-- --status]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database/migrations');
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
  .sort();
// Line endings and a UTF-8 BOM do not change the checksum.
const read = (file: string) =>
  fs
    .readFileSync(path.join(dir, file), 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n');
const checksum = (text: string) => createHash('sha256').update(text).digest('hex');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('SELECT pg_advisory_lock(hashtext($1))', ['schema_migrations']);
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const { rows } = await client.query<{ filename: string; checksum: string }>(
    'SELECT filename, checksum FROM schema_migrations',
  );
  const applied = new Map(rows.map((r) => [r.filename, r.checksum]));
  for (const [file, sum] of applied) {
    if (!files.includes(file)) throw new Error(`적용한 마이그레이션 파일이 없습니다: ${file}`);
    if (checksum(read(file)) !== sum)
      throw new Error(
        `적용한 마이그레이션 파일이 바뀌었습니다: ${file}. 새 번호의 파일을 추가하세요.`,
      );
  }
  const pending = files.filter((f) => !applied.has(f));
  if (process.argv.includes('--status')) {
    for (const f of files) console.log(`${applied.has(f) ? '적용됨' : '대기'}  ${f}`);
  } else {
    for (const file of pending) {
      const text = read(file);
      await client.query('BEGIN');
      try {
        await client.query(text);
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [
          file,
          checksum(text),
        ]);
        await client.query('COMMIT');
        console.log(`적용  ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    if (!pending.length) console.log('적용할 마이그레이션이 없습니다.');
  }
} finally {
  await client.end();
}
