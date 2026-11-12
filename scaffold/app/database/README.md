# {{project.title}} PostgreSQL

PostgreSQL {{versions.postgres}}. The source of the schema is `migrations/NNN_<description>.sql`, applied in file name order.

## Applying migrations

Run from the umbrella repo root. It uses `DATABASE_URL` in `.env` (host port {{project.ports.db}}).

```powershell
npm run db:migrate              # apply only the files not yet applied, in order
npm run db:migrate -- --status  # only show applied and pending lists (no DB change)
```

- The runner is `backend/src/migrations.ts` (rules) and `backend/src/migrate.ts` (command). The source of the rules is `docs/conventions/database.md` in the central repo `project-standards`.
- The applied history is kept in `schema_migrations` (file name `name`, checksum `checksum`, applied time `applied_at`). A file and its record are committed in one transaction. On failure, only that file is rolled back and the run stops.
- In these cases it fails without applying anything: an applied file was edited or deleted, a new file has a number lower than one already applied, a number is duplicated, or a name does not match the format. Add the fix as a file with a new number.
- Do not use down (rollback) files. Correct a wrongly applied change with a file with a new number, and recover data from a backup.
- Write every file so that it is safe to run again (`IF NOT EXISTS`, `ON CONFLICT`, and so on). This is because on an empty volume, the Docker initialization runs first. The shared CI checks in the same order (once with psql, once with the runner).
- Do not pass SQL through a PowerShell pipe (`Get-Content … | psql`). Windows PowerShell 5.1 garbles Korean text.
