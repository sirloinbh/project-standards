# #61 Sync script: rendering and preview (dry-run)

## Change

| File | Content |
|---|---|
| `scripts/lib/sync-plan.mjs` | Computes the sync plan for one target: renders the profile templates, skips allowed differences (`allowedDifferences`), fails on a protected path (`neverTouch`) violation, merges `package.json` fields, and generates `.standards/manifest.json` |
| `scripts/sync.mjs` | `--dry-run --out <folder>` writes the per-target result files and `plan.json`. With `--local <repo>=<path>`, it reads the local clone and shows the result merged with the real files |
| `scripts/lib/render.mjs` | Preserves project-specific lines of section-managed files at first sync (below) |
| `scripts/test/sync.test.mjs`, `fixtures/sync-snapshot.json` | Tests for glob, field merge, plan, and CLI, and a file list snapshot of the 9 targets |
| `package.json` | `npm run sync:preview` (the result goes to the ignored `.local/sync-preview/`) |

## Problem found in the preview and its fix

When I ran the preview with the local workout-memo clone, the project-specific lines in `.gitignore` and `.prettierignore` (`test-results/`, `playwright-report/`, `docs/openapi.json`) disappeared at the first sync. This was because those files did not yet have the `# --- project ---` marker line.

So for the first sync of a file without the marker line, I changed it to move existing lines that are not in the central section into the project section. After the fix, I ran the preview again and confirmed that the three lines remain below the marker line.

## Snapshot

`scripts/test/fixtures/sync-snapshot.json` is the list of files the 9 targets receive and their management mode (full, section, fields). App repos get 31 files and the infrastructure repo gets 15. If you changed a template on purpose, update it with `UPDATE_SNAPSHOT=1 npm test` and check in review what changes in downstream repos.

## Checks

- `npm run check`: 73 tests passed, `registry-check: ok`, `docs/projects.md: up to date`
- Local preview (`--local study-log=../study-log --local workout-memo=../workout-memo`):
  - 32 files each (including the manifest) were produced.
  - workout-memo `package.json` kept its existing 19 scripts and 9 devDependencies, and only the managed fields changed.
  - study-log `.editorconfig` got only one header line added.
