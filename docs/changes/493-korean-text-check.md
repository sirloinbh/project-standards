# 493: Korean-text check in the compliance report

## Problem

The English switch (#453) spans 11 repos. Nothing confirmed that a repo was fully translated or caught new Korean text later.

## Change

- `scripts/lib/korean-text.mjs` (new): counts markdown files and code-comment lines containing Hangul. It skips `node_modules`, `dist`, `build`, `coverage`, `.git`, lockfiles, binary or unknown file types, and snapshot fixtures. `DEFAULT_ALLOW` keeps the legacy header (`LEGACY_HEADER_TEXT`) and the pre-#455 sync commit prefix.
- `scripts/lib/compliance.mjs`: `repoStatus` carries a `korean` result; the report has a "Korean text" column (`✓`, or `△ N md, M comments` as a warning, not `✗`) and a "Korean text" section listing the first 10 files per repo.
- `scripts/compliance.mjs`: scans local clones fully; the API scan reads at most 300 files per repo (markdown first) and marks the result "partial scan" when capped.
- `scripts/lib/remote-repo.mjs`: `paths()` lists the files of the default branch.
- `docs/korean-text-check.md` (new): what is counted, how to read the result, and the allow list.
- Tests in `scripts/test/compliance.test.mjs`; the column regex in `scripts/test/repo-settings.test.mjs` was updated.

## Checks

- `UPDATE_SNAPSHOT=1 npm test` and `npm run check` (results in the PR).
- Switching the warning to `✗` is a later step, after every repo is translated.
