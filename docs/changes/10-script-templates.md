# #10 PowerShell script templates (gh-project, backup, push-repositories)

## Diff analysis (against origin/main, 2026-10-22)

| Script | Comparison across the 8 apps | Handling |
|---|---|---|
| `scripts/gh-project.ps1` | Identical in all 8 | Used as-is as a template |
| `scripts/claude-skills.mjs` | Identical in all 8 | Used as-is as a template (managed per the design.md classification table) |
| `scripts/backup.ps1` | Identical in 7, only workout-memo differs | **Based on the workout-memo version** (see below) |
| `scripts/push-repositories.ps1` | Identical in 7; workout-memo has one more `infrastructure` line | Based on the 7-app version. Once the infrastructure source is moved (#93, #94), workout-memo becomes the same |

## backup.ps1: fix for garbled Korean text

workout-memo already fixed the problem of backups garbling Korean text in #55. When Windows PowerShell receives `pg_dump` output, it interprets it with the console code page (CP949), which garbles Korean text. The fix writes the dump to a file inside the container and then copies it as-is with `docker compose cp`.

The other 7 apps still use the old way of capturing the output, so they have the same bug. Because the template is built from the workout-memo version, the 7 apps also receive this fix at the first sync. The first part of the backup file name is the project name (`{{project.name}}-`). For workout-memo it changes from `workout-…` to `workout-memo-…`.

## Change

| File | Content |
|---|---|
| `templates/app/scripts/gh-project.ps1`, `claude-skills.mjs` | Originals as-is, only the managed header added |
| `templates/app/scripts/backup.ps1` | Project name injected |
| `templates/app/scripts/push-repositories.ps1` | The 3 subtree repo names are injected from the registry |
| `scripts/test/scripts-templates.test.mjs`, snapshot | 3 tests; 4 files per app added to the downstream repo file list |

## Checks

- `npm run check`: 126 tests passed
- A test confirms that the backup file location (`backups/`) is in the common `.gitignore` and is not committed.

## Problem found in CI

On the first PR, CI failed one test. `.gitattributes` checks out `*.ps1` with CRLF, but the rendered output uses LF, so a direct comparison with the original text differed. Sync and hash comparison already ignore line endings, so this is not a functional problem; only the test was fixed to compare using LF. I reproduced the CRLF checkout locally and confirmed that the fixed test passes.
