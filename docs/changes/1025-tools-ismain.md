# #1025 Compare real paths in the isMain check of tools/*.mjs

- Issue: [#1025](https://github.com/sirloinbh/project-standards/issues/1025)
- Branch: `fix/1025-tools-ismain`
- Date: 2026-11-23 (Asia/Seoul)

## Problem

Follow-up to #970. The five `tools/*.mjs` scripts (`app-secrets`, `dependency-prs`, `labels`, `project-board`, `repos`) still compared `path.resolve(process.argv[1])` with `fileURLToPath(import.meta.url)`. Through a symlink or junction path this is false, so the script exits 0 without running.

## Change

- The five files compare `fs.realpathSync` of both sides (`fs` imported in `dependency-prs` and `project-board`).

## Checks

- `npm run check` (Git Bash, Windows): pass.
