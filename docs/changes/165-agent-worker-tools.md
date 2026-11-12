# #165 Move the local agent worker to tools/agents and separate per-repo fixed values

## Change

| File | Content |
|---|---|
| `tools/agents/*.mjs` | Moved the 9 files of workout-memo `scripts/agents/`. State transitions, locking, hash protection, redaction, model assignment, npm path selection, and output summaries are unchanged |
| `tools/agents/config.mjs` (new) | Resolving the `origin` address, the registry allow list, and validating the repo config `.agents.json` |
| `tools/agents/cli.mjs` | Takes the target repo with `--root <folder>`. Reads the repo name from `origin`, and uses the `gh-project.ps1` in the install folder. Reads the check script, DB precheck, browser verification arguments, and auto merge from `.agents.json` |
| `tools/agents/workflow.mjs` | Validates issue URLs against the target repo. Creates the branch as `<type>/<number>-<english-slug>` and the change record as `docs/changes/<number>-<english-slug>.md` |
| `tools/agents/optimization.mjs` | Replaced the hardcoded 5 tables and columns of the DB precheck with config values. If there is no config, the schema check is skipped |
| `scripts/test/agent-*.test.mjs` | Moved the 10 workout-memo tests and fixed the paths and fixtures |
| `scripts/test/agent-repos.test.mjs` (new) | With 2 fake repos with different configs: from queue registration to the host check, rejecting an unregistered repo, config errors, and no repo values in the source |
| `package.json`, `.github/workflows/agents.yml` | Added `test:agents`. It runs on Windows CI (on Linux, `npm run check` in `ci.yml` includes the same tests) |
| `versions.json`, `versions.schema.json`, `scripts/check-workflows.mjs` | Added the pinned Windows runner `windowsRunner: windows-2025`, and the workflow check allows it along with `runner` (the runner pin rule of #143) |
| `docs/tools.md`, `docs/design.md` | How to run, the `.agents.json` format, and the classification "central tools are not copied to downstream repos" |

## User decisions (2026-10-22)

The user decided these in the review of PR #177. No items to confirm remain.

- **Repo config file:** `.agents.json`, committed at the repo root. PC-specific values (`codexExecutable`, `npmCli`, `browserExecutable`) stay in `.local/agent-workflow/config.json` as now.
- **Auto merge default:** `true`. Merge after CI passes, and only when `.agents.json` has `"autoMerge": false` does the worker mark the PR ready and leave the merge to the user. Repos where merging to main is a production deploy can turn it off with `false`.
- **Branch types:** four, `feat`, `fix`, `docs`, `chore`. Choose with `--branch-type`; if absent, `docs` for `--task-kind documentation`, otherwise `feat`. Give the English slug with `--slug`; if absent, build it from the English words in the title. If the title is only Korean, it becomes `agent-task`.
- **Check command:** Accepts only an npm script name (`checkScript`) instead of a shell command. The worker keeps its principle of running without a shell.
- **Windows runner:** Pinned with `windowsRunner` (`windows-2025`) in `versions.json`.
- **Launcher:** `scripts/agents.ps1` and its 2 PowerShell boundary tests are rebuilt in #166. Putting the registry into the installed copy is also done in #166, and the workout-memo copy is removed in #167.

## Implementation notes

- **Unknown keys fail:** If a misspelled key such as `automerge` were silently ignored, the policy would apply differently from what was intended. So if there is a config error, no command runs.
- **Compatibility with earlier jobs:** Jobs already in the queue keep using the stored branch and `docs/changes/<number>-agent-task.md`.
- **CI check name `verify`:** Left as it is because it is the job name in the central reusable CI.
- **Registry location:** `../../registry/` relative to `tools/agents/` (this repo) or `../registry/` (installed copy).

## Verification

- `npm run test:agents` (Windows): all 190 passed. On Linux, the 1 Windows-only npm path check is skipped.
- `npm run check` (after merging main with #175 and #176, Windows): 382 of 383 tests passed, 1 skipped (an existing OS-specific check). All other checks passed.
- PR CI: the first run failed because of main's runner and Action pins (#143) and the setup-node automatic cache (no lockfile). After the fix, Linux `check` and Windows `windows` both passed.
- `grep -rn "workout-memo\|brands" tools/agents`: 0 matches.
