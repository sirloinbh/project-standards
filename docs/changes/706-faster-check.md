# #706 Speed up npm run check

## Change

| File | Content |
|---|---|
| `package.json` | New `check:docs`: registry, generated docs, plugin, self copies, workflows, and secrets checks without the test suite (under 3 seconds). `test:agents` is already gone with #708, so its file list needs no glob |
| `AGENTS.md` | `check:docs` in the verification table, for docs-only changes. CI still runs the full `npm run check` |

## Per-file test times (2026-11-19, Windows, one file at a time)

Total about 139 s serial. `node --test` runs the files in parallel, so the slowest file sets the wall-clock time.

| File | Time |
|---|---|
| `scripts/test/deploy-templates.test.mjs` | 68.3 s |
| `scripts/test/repos.test.mjs` | 13.1 s |
| `scripts/test/tools.test.mjs` | 12.6 s |
| `scripts/test/standards-check.test.mjs` | 6.7 s |
| `scripts/test/labels.test.mjs` | 3.3 s |
| `scripts/test/sync.test.mjs` | 2.9 s |
| `scripts/test/scaffold.test.mjs` | 2.6 s |
| `scripts/test/package-install-hook.test.mjs` | 2.2 s |
| `scripts/test/project-board.test.mjs` | 1.7 s |
| `scripts/test/app-secrets.test.mjs` | 1.5 s |
| `scripts/test/secret-scan.test.mjs` | 1.4 s |
| `scripts/test/dependency-prs.test.mjs` | 1.3 s |

## Findings and what is left

- `deploy-templates.test.mjs` is 68 s of the 139 s: its tests start `bash` (Git Bash on Windows) many times for the 8 rendered apps. It alone sets the wall-clock time of the test run. Splitting it into 3 or 4 files by topic (backup, ssm-get, notify/report, autodeploy/remote-deploy) would let the parallel runner cut the run from about 68 s to about 25 s.
- I did not split it here: it is a deploy-template test other lanes edit often (#611, #644), so a split would conflict with their open work. It needs the owner go-ahead (remaining task of #706).
- `repos.test.mjs` (13 s) and `tools.test.mjs` (12.6 s) start PowerShell and are fine for now.

## Checks

- `npm run check:docs` passes in under 3 s. `npm run check` result is in the PR.
