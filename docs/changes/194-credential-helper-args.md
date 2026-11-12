# #194 Fix the credential path change command (path, array argument, ToolsDir default)

## Change

| File | Content |
|---|---|
| `tools/set-credential-helper.ps1` | Takes the repos as one comma-joined string (`-Repository a,b`). Sets the `-ToolsDir` default in the body. On Windows PowerShell 5.1, escapes the double quotes in the helper string and wraps the helper's `gh-project.ps1` path in quotes. Stops if `git config` fails |
| `docs/tools.md` | Changed the moving procedure to use one variable `$base` for the parent folder of the repos. Removed paths that contained a specific user name. Changed `git switch main; git pull` in step 1 to be done in Fork. Step 2 and the rollback use `-Repository ($repos -join ',')`. Step 3 notes that `fetch` on a public repo does not verify authentication |
| `scripts/test/tools.test.mjs` | Added a check that runs the script copied into an install folder (with a space) using `-File`, without `-ToolsDir`, and with 2 repos passed comma-joined. This check fails with the script before the fix. Added `set-credential-helper.ps1` to the ASCII check list |

## Cause (reproduced during #21)

- **Array argument:** `powershell -File script.ps1 -Repository $repos` passes the array as several space-separated arguments. From the second path on they are handled as positional arguments and fail. `ValueFromRemainingArguments` does not collect values after a named parameter (confirmed on 5.1), so we chose the comma-separated form.
- **`-ToolsDir` default:** When a script with a `[Parameter()]` attribute is run with `-File` on 5.1, `$PSScriptRoot` in the parameter default is an empty string. In the body it gives the correct value. The existing test always passed `-ToolsDir`, so it did not catch this case.
- **Quotes:** When we tried to wrap the path in quotes, 5.1 did not escape the double quotes inside the argument. So `git config` failed with `wrong number of arguments`. Even so, the script printed `after:` without checking the exit code. We added both the escaping and the exit code check.
- `install.ps1`, `agents.ps1`, and `project-terminal.ps1` use `$PSScriptRoot` only in the body, so they do not have this problem.

## Decisions

- Wrapping the path in quotes was not in the issue's tasks. It showed up when the new check used an install folder with a space, so we fixed it together. The helpers already changed in the 10 repos (no quotes, path with no spaces) keep working, so they do not need to be rerun.
- Repo folder paths that contain a comma are not supported.

## Verification

- `node --test scripts/test/tools.test.mjs`: 14 passed. The new check fails if we switch to the script from `origin/main`.
- `npm run check` passed (392 of 393 tests passed, 1 skipped; registry-check, docs check, tokens check, package-guard, check-workflows).
- Checked directly on this PC: changed 2 temporary repos using the script in a temporary install folder with a space. Then, with `GIT_TRACE=1 git credential fill`, we confirmed that Git runs the quoted path as one argument and receives the credential. We did not record the token value.
