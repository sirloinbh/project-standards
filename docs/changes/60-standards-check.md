# #60 Downstream repo check script (standards-check)

## Change

| File | Content |
|---|---|
| `scripts/standards-check.mjs` | Finds where a downstream repo differs from the central standard. It checks three things: managed files (full, section, fields), shared packages (version, install scripts, dependencies), and registry values (ports, DB name) |
| `templates/index.json` (`vendor`) | Copies the check script and 3 libraries (`manifest`, `hash`, `render`) as is into `.standards/` of the downstream repo. No template variable substitution |
| `templates/index.json` (`fields`) | The root `package.json` must have a `standards:check` script |
| `scripts/lib/manifest.mjs` | Records the central source path (`source`) in manifest entries, so failure messages can say where to fix |
| `scripts/lib/templates.mjs` | Vendor copy handling |
| `scripts/test/standards-check.test.mjs` | 11 tests that build temporary repos and check normal and per-violation cases |

## What is checked

- **Managed files:** fails in these cases.
  - The file is missing
  - The content differs (CRLF is treated as the same)
  - The central section above `# --- project ---` changed, or the marker line is gone
  - The managed fields in `package.json` differ
- **Shared packages:** not installed, wrong version, an install script (`preinstall`, `install`, `postinstall`, `prepare`) present, or `dependencies` not empty.
- **Registry values:** compares ports and the DB name in the following files with the registry values.
  - `compose.yaml`: web, DB, and API ports. The `${WEB_PORT:-8101}:80` form is also read
  - `frontend/vite.config.ts`: Vite port, API proxy port
  - `frontend/nginx.conf`, `backend/Dockerfile` (`EXPOSE`), `backend/src/server.ts`: API port
  - `.env.example`: API port, DB port, DB name
  - `playwright.config.ts`: the two e2e ports
  - If a file is missing, it is skipped. If the file exists but the pattern is not found, only a warning is given.
- **Warning (not a failure):** Vite has no `strictPort: true`.

## Output and exit codes

- There are three exit codes: 0 pass, 1 violation, 2 no manifest.
- On a violation, it prints the following in Korean.
  - The violating file and the reason, and the central source path
  - An example command to open an issue and a PR in the central repo
  - How to register in `allowedDifferences`
  - If there is an open sync PR, a note to merge it first

## Checks

- `npm run check`: 65 tests passed, `registry-check: ok`, `docs/projects.md: up to date`
- Running the copy alone: I ran `.standards/check.mjs` in a temporary repo directly and confirmed exit codes 0, 1, and 2 and the messages.
- I confirmed that the 4 copied files import only Node built-in modules and each other.
- On the first run, 1 test failed. The central source path is correctly appended even to the "file missing" message, but the test's expected value left it out. I fixed the expected value.
