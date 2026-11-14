# #441 Share node_modules between Orca worktrees

## Change

| File | Content |
|---|---|
| `docs/worktree-shared-deps.md` | What to share and not share, the dependency-change rule, safe removal, what Orca documents, and the 2026-11-14 test on this PC (junctions, removal keeps the main folder) |
| `templates/app/orca.yaml` | `worktree.sharedDirectories` with `node_modules`, `frontend/node_modules`, `backend/node_modules`; synced to app repos as a fully managed file |
| `docs/tools.md` | Link to the new doc |
| `templates/app/.prettierignore.tmpl` | Added `orca.yaml` (managed file, so Prettier must not format it) |
| `scripts/test/fixtures/sync-snapshot.json` | New synced file list |

## Confirmed and unconfirmed

- Confirmed from the Orca docs: the `orca.yaml` schema, gitignored-and-existing rule, missing paths skipped.
- Tested on this PC (2026-11-14) with `orca worktree create` and `orca worktree rm` in plan-routine: Orca makes junctions without administrator rights or developer mode, and removing the worktree kept all 20,794 files of the main `node_modules` (compared with a backup).

## Checks

- `npm run check`: passed (539 tests, 0 failed).
