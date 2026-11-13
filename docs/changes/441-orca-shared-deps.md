# #441 Share node_modules between Orca worktrees

## Change

| File | Content |
|---|---|
| `docs/worktree-shared-deps.md` | What to share and not share, the dependency-change rule, safe removal, what Orca documents and what is unconfirmed, the user test |
| `templates/app/orca.yaml` | `worktree.sharedDirectories` with `node_modules`, `frontend/node_modules`, `backend/node_modules`; synced to app repos as a fully managed file |
| `docs/tools.md` | Link to the new doc |
| `templates/app/.prettierignore.tmpl` | Added `orca.yaml` (managed file, so Prettier must not format it) |
| `scripts/test/fixtures/sync-snapshot.json` | New synced file list |

## Confirmed and unconfirmed

- Confirmed from the Orca docs: the `orca.yaml` schema, gitignored-and-existing rule, missing paths skipped.
- Unconfirmed: symlink vs junction and developer mode on Windows, and removal behavior. The user must test a new Orca worktree (Part of #441).

## Checks

- `npm run check`: passed (539 tests, 0 failed).
