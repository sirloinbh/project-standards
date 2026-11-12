# #76 Security check script (blocked packages, IOC)

## Change

| File | Content |
|---|---|
| `security/blocked-packages.json` | The check baseline. 3 packages and 1 scope reported as compromised, 7 addresses suspected of data exfiltration, suspicious workflow names, and suspicious file names that install scripts run. The source is the user's global rule (2026-10-22), and it keeps being updated |
| `scripts/ioc-scan.mjs` | Reads and checks `package-lock.json` across the whole repo (including nested installs), install scripts in `package.json`, install scripts in the installed `node_modules`, and `.github/workflows`. It does not run package code |
| `templates/index.json` | Copies `.standards/ioc-scan.mjs` and `.standards/blocked-packages.json` to downstream repos |
| `scripts/test/ioc-scan.test.mjs`, `fixtures/sync-snapshot.json` | 6 tests, and 2 files added to the file list downstream repos receive |

## Verdicts

- **Failure (exit code 1):**
  - A package or scope reported as compromised is in the lockfile. For entries without version information, a person checks whatever the version is.
  - A `preinstall`, `install`, `postinstall`, or `prepare` script calls an address suspected of exfiltration or runs `bundle.js` or `processor.js`.
  - A workflow name contains `shai-hulud`, or the workflow content has an address suspected of exfiltration.
- **Warning:** the list of dependencies that have install scripts. These are targets that do not run because of `ignore-scripts=true` in `.npmrc`.
- Checking shell settings such as `~/.bashrc` on the user's PC is outside the repo, so it is out of scope.

## Real check results (2026-10-22, local clones)

| Repo | Result | Dependencies with install scripts (warning) |
|---|---|---|
| project-standards | No suspicious items | None |
| workout-memo | No suspicious items | esbuild, fsevents, tesseract.js |
| The other 7 apps | No suspicious items | esbuild, fsevents |

Whether `esbuild` and `tesseract.js` still build and run with install scripts off (`ignore-scripts=true`) must be verified with the Docker build at the first workout-memo sync (#97). I left a note on #97.

## Checks

- `npm run check`: 79 tests passed, `registry-check: ok`, `docs/projects.md: up to date`
- Running the copy alone: I confirmed that `.standards/ioc-scan.mjs` in a temporary repo finds the neighboring `blocked-packages.json` and fails with exit code 1.
