# #19 Move personal-account tools to the central repo (tools/, install location, VS Code settings)

## Change

| File | Content |
|---|---|
| `tools/gh-project.ps1` | workout-memo original as-is (identical in the 8 apps) |
| `tools/project-terminal.ps1` | `ghp` now calls `gh-project.ps1` in the **same folder** instead of `%LOCALAPPDATA%\gh-workout-memo` |
| `tools/open-vscode-account-b.cmd` | Generalized the launcher that was workout-memo only. With `--project <folder>` it opens the personal environment; other folders keep the existing environment. The personal VS Code data folder still uses the existing `VSCode-Account-B-workout-memo` (renaming it would lose extensions and sign-in state) |
| `tools/install.ps1` | Installs into `%LOCALAPPDATA%\sirloinbh-tools`. Backs up only the files that change and does not touch the old location |
| `tools/set-credential-helper.ps1` | Switches a repo's credential helper to the new location or back to the old one |
| `templates/common/.vscode/settings.json.tmpl` | Terminal profile name changed to "sirloinbh PowerShell" and the path to `sirloinbh-tools`. Synced to 9 repos (9 snapshot entries added) |
| `.gitattributes` | Checks out `*.cmd` with CRLF. Batch files with LF only can mishandle `goto` and labels |
| `docs/tools.md` | Install, per-repo auth switching, desktop launcher, rollback |
| `scripts/test/tools.test.mjs` | Windows checks moved from workout-memo `project-github-auth.test.mjs`, plus install and auth-switch checks |

## Problem found by tests

- **Empty string argument problem:** Windows PowerShell 5.1 drops an empty string argument (`''`) passed to an external program. As a result, the empty helper line that clears the global helper was not passed to git. For PowerShell 5, it now passes `'""'`. I confirmed that the empty `helper =` line is written first in the real git config file.

## Later work

- The user does the actual install and the auth switch of the 10 repos (#21). Because the synced VS Code settings use the new location, I added #21 as a prerequisite of the first sync (#97).
- Cleaning up workout-memo's `scripts/project-terminal.ps1`, `open-vscode-account-b.cmd`, `docs/project-github-auth.md`, and the auth tests is a separate issue in the workout-memo repo.

## Checks

- `npm run check`: 138 tests passed. Run on Windows, so the 12 PowerShell and cmd checks really ran.
