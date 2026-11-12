# #290 Clean up CodeQL alerts in the central repo

## Alerts and handling

| Alert | Location | Handling |
|---|---|---|
| `js/incomplete-sanitization` (high) | `cell()` in `scripts/lib/compliance.mjs` | Fixed. In a table cell, `\` is escaped first and then `|`. If a value ended with `\`, the next cell separator `|` was escaped and the table could break |
| `js/incomplete-url-substring-sanitization` (high) | `scripts/test/deploy-templates.test.mjs` (new in PR #293) | Fixed. The check "the signal address is not in the output" tested for a URL substring, so it read as URL validation. We now check with the UUID in the address |
| `js/shell-command-injection-from-environment` (medium) | `scripts/test/tools.test.mjs` | Closed ("used in tests"). A Windows-only test passes a temporary path it made itself to `cmd.exe`. There is no way for user input to get in |

`js/missing-rate-limiting` (the scaffold health route) is a problem for the whole app API, so it is handled in #291.

## What happened

For PR #293, the CodeQL check failed with 1 new alert, but the merge command ran before the check result was confirmed, and it was merged. The central repo has no branch protection, so nothing stopped it. From now on, the agent merges only when `pr checks --watch` all passes (exit code 0).

## Verification

- `node --test scripts/test/compliance.test.mjs scripts/test/deploy-templates.test.mjs`: 28 of 29 passed, 1 skipped (no python3, an existing test)
- `npm run check`: 460 of 461 tests passed, 1 skipped, 0 failed
