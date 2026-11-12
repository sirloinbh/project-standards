# #166 Build the agent worker install and the repo-targeted launcher (install.ps1, agents.ps1)

## Change

| File | Content |
|---|---|
| `tools/agents.ps1` (new) | Accepts the 12 commands of workout-memo `scripts/agents.ps1` as they are, and adds `-Root <repo folder>`. If the folder is not a repo, it creates nothing and stops. It also passes `-BranchType` and `-Slug` from #165 |
| `tools/install.ps1` | Also installs `agents.ps1`, `agents/*.mjs`, `registry/projects.json`, and `versions.json`. Backing up only changed files as `.bak-<time>` is unchanged |
| `scripts/test/agent-repos.test.mjs` | With the launcher installed in a temporary folder: `status` of two fake repos shows only each one's queue, a non-repo folder is rejected, and `-Root`, `-BranchType`, `-Slug` are passed (Windows only) |
| `scripts/test/agent-runtime.test.mjs` | Put back the 2 PowerShell→Node boundary tests deferred in #165 (`enqueue -TaskKind`, `diagnose`) |
| `scripts/test/tools.test.mjs` | The install targets include the worker, registry, and `versions.json`; changed worker files are backed up; the 2 `.ps1` files use only ASCII |
| `docs/tools.md` | Install folder layout, run commands, `.agents.json` examples (without and with the DB precheck), how to roll back |

## Implementation notes

- **Choosing Node:** `.local\node-v<node in versions.json>-win-x64\node.exe` in the target repo, otherwise `node.exe` on PATH. If the version differs, it only warns and continues. The warning goes to standard error so it does not break the JSON output of `status`.
- **Location of versions.json and the registry:** next to the launcher in the installed copy, and one level above `tools/` in this repo. This is the same rule as the worker's registry lookup (#165).
- **`CODEX_HOME`:** If empty, the same `%LOCALAPPDATA%\Codex-Account-B` as `project-terminal.ps1`.
- **Exit code:** Returns the exit code of the Node CLI as it is. The CLI already writes error messages to standard error.
- **ASCII only:** Windows PowerShell 5.1 reads a `.ps1` without a BOM in the ANSI code page, so we do not use Korean in the launcher and install script.
- **Deleted files:** Worker files deleted from the source stay in the install folder. We did not add behavior that deletes installed files (the existing principle of "only back up, never delete").

## Next steps

- The user does the real PC install (same procedure as #21, `docs/tools.md`).
- Removing the `scripts/agents.ps1` and `scripts/agents/` copies in workout-memo and switching over is #167.

## Verification

- `node --test scripts/test/agent-repos.test.mjs`: 25 passed (including 3 new Windows checks).
- `node --test --test-name-pattern=PowerShell scripts/test/agent-runtime.test.mjs`: 2 boundary tests passed.
- `node --test scripts/test/tools.test.mjs`: 13 passed.
- `npm run check` (Windows): 389 of 390 tests passed, 1 skipped (an existing OS-specific check). All other checks passed.
