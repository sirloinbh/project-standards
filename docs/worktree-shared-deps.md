# Sharing dependency folders between Orca worktrees (#441)

New Orca worktrees can reuse the main checkout's `node_modules` instead of running `npm ci` again. This saves disk space and install time. App repos receive the setting through the synced `orca.yaml` (`templates/app/orca.yaml`).

## What Orca documents (checked 2026-11-14)

Source: the Orca docs pages for worktrees and settings (https://orca.dev/docs/model/worktrees, https://orca.dev/docs/settings).

Confirmed:

- `orca.yaml` at the repo root, with a `worktree.sharedDirectories` list of directory paths.
- It is a repo-checked-in list of gitignored directories that are shared (symlink/share, not copy) with new worktrees.
- An entry must exist as a directory in the primary checkout and be gitignored. Tracked or missing paths are skipped, so listing `backend/node_modules` in a repo without a backend is harmless.
- Entries add to the per-user "Worktree Shared Paths" setting and never replace it.
- Deleting a worktree removes its directory and branch.

Tested on this PC on 2026-11-14 (Windows 11, no administrator rights, no developer mode), in plan-routine with `orca worktree create` and `orca worktree rm`:

- Orca makes a **junction** for each listed folder that exists in the main checkout (`node_modules`, `frontend/node_modules`). A listed folder that does not exist (`backend/node_modules`) is skipped.
- Removing the worktree with Orca removes only the links. The main checkout's `node_modules` kept all 20,794 files (compared with a backup taken before the test).

## Share

- `node_modules`, `frontend/node_modules`, `backend/node_modules` (where present).

## Never share

- `.next`, `dist`, `build`, and other build or test caches. They hold per-branch output and break when two worktrees write to them.
- `.env` and other secret files. Copy them per worktree if needed; never link them.

## Dependency changes

A branch that changes `package.json` or `package-lock.json` must not use the shared folder, because `npm install` or `npm ci` in it would change the main checkout's `node_modules` for every worktree.

1. Remove the link (see "Safe removal").
2. Run a separate install in that worktree. This is a package install, so get user approval first.
3. Do not merge or reuse that worktree's `node_modules` for other branches.

## Safe removal

A link looks like a real folder. Never delete it with `rm -r`, `Remove-Item -Recurse`, or an editor "delete folder": that can delete the real folder in the main checkout.

- Windows junction: `cmd /c rmdir <path>` (removes only the link, and refuses a non-empty real folder).
- Symlink on macOS or Linux: `rm <path>` without `-r` and without a trailing slash.
- To check first: `dir <parent>` shows `<JUNCTION>` or `<SYMLINKD>` for a link.

## Checking a worktree

- `cmd /c dir /AL` in the worktree lists the links. If a listed folder is a normal folder, Orca did not link it (for example, it did not exist in the main checkout when the worktree was made).
- Delete worktrees through Orca (or `orca worktree rm`), not by deleting the folder by hand.
