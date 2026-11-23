# #970 Make npm run check pass on macOS

- Issue: [#970](https://github.com/sirloinbh/project-standards/issues/970)
- Branch: `fix/970-macos-check`
- Date: 2026-11-23 (Asia/Seoul)

## Problem

On macOS, `npm test` failed 5 of 616 tests, so `npm run check` stopped before its other checks.

1. BSD `wc -l` pads its number, so `backup.sh.tmpl` printed `       2 tables` where GNU `wc` prints `2 tables`.
2. `isMain` compared `path.resolve(process.argv[1])` with `fileURLToPath(import.meta.url)`. `os.tmpdir()` on macOS is a symlink (`/var/folders` → `/private/var/folders`), so a script copy run from the temp folder skipped its main code and exited 0 silently.

## Change

- `templates/deploy/deploy/backup.sh.tmpl`: the table count goes through `tr -d ' '` (both the log line and the signal message).
- All 12 `scripts/*.mjs` files with an `isMain` check compare `fs.realpathSync(process.argv[1])` with `fs.realpathSync(fileURLToPath(import.meta.url))`.
- Not changed here: the 5 `tools/*.mjs` files with the same check (outside this lane's paths; the two guard hooks were fixed in #526).

## Checks

- `npm run check` (Git Bash, Windows): pass.
- The macOS run itself and the CI macOS decision are left for the user (no Mac here).
