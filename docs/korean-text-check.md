# Korean-text check

The daily compliance report ([compliance.md](compliance.md)) has a "Korean text" column (#493). It shows, per repo, how many markdown files and how many code-comment lines still contain Korean (Hangul), so the English switch (#453) can be tracked and the Korean text does not come back.

## What is counted

- Markdown files (`.md`, `.mdx`): each file with at least one Hangul line counts once.
- Code-comment lines: lines in source files (JS/TS, shell, YAML, Python, PowerShell, Terraform, HTML, CSS, SQL and similar) where Hangul comes after a comment marker (`//`, `/*`, a leading `*`, `#`, `<!--`). Hangul inside a string literal on a line with no comment marker is not counted.
- Skipped: `node_modules`, `dist`, `build`, `coverage`, `.git`, lockfiles, binary or unknown file types, and snapshot fixtures (`*.snap`, `__snapshots__/`, `snapshots/`, `fixtures/`).

## Result in the report

- `✓`: no Korean found.
- `△ N md, M comments`: a warning, not `✗`. Switch it to `✗` once every repo is translated.
- `—`: the repo was not scanned (unknown status).
- `(partial scan)`: the API scan reads one blob per file, so it is capped at 100 files per repo (markdown first) so the daily run stays well inside the API rate limit (#464). The count is a lower bound; a local run scans everything.
- The "Korean text" section lists the first 10 files per repo.

## Allow list

Literals that code matches on must stay Korean. `DEFAULT_ALLOW` in `scripts/lib/korean-text.mjs` removes them from a line before it is checked:

- The legacy managed-file header (`LEGACY_HEADER_TEXT` from `scripts/lib/render.mjs`).
- The pre-#455 sync commit prefix `chore: 중앙 표준 동기화 (project-standards@`.

To allow another literal, add it to `DEFAULT_ALLOW` and note why in the PR.
