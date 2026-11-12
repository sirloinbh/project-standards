# #276 Commands for batch repo status, pull, and run, and a VS Code workspace file

## Change

| File | Content |
|---|---|
| `tools/repos.mjs` | `status` (branch, changes, behind/ahead), `pull` (`--ff-only`, only for clones that are on main and clean), `run -- <command>` (install commands are rejected with `findInstall` from the blocking hook), `workspace` (`.local/sirloinbh.code-workspace`) |
| `scripts/test/repos.test.mjs` | 6 tests with a temporary origin and clones |
| `docs/tools.md` | Usage |

The repo list is this repo plus the targets in `sync.config.json`. file-control is not in the registry, so it is not included. The recommended GitHub Pull Requests extension is added in #247 together with `.vscode/extensions.json`.

## Real run (2026-10-27, `status`, no fetch)

| Repo | Branch | Uncommitted changes | Behind / ahead |
|---|---|---|---|
| project-standards | feat/276-repos-command | 3 | 0 / 0 |
| workout-memo | research/112-ux-audit | 0 | 44 / 0 |
| study-log and 6 other apps | main | 0 | 0 / 0 |
| shared-aws-infrastructure | (no clone) | | |

We created a workspace file with 10 repos using `workspace`.

## Verification

- `node --test scripts/test/repos.test.mjs`: 6 passed
