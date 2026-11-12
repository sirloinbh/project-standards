# #268 Commands to view dependency PRs across all repos and close them in bulk

## Change

| File | Content |
|---|---|
| `tools/dependency-prs.mjs` | `list`: shows open Dependabot PRs as a table by package and target version. `close`: closes the PRs of a package (narrowed by target version and repo) with a reason comment after a confirmation question. No merging. Stops if the account is not sirloinbh |
| `scripts/test/dependency-prs.test.mjs` | 6 tests with a fake gh: title parsing, grouping, account check, confirmation question, and close failure report |
| `docs/tools.md` | Usage |

## Real run (2026-10-27, `list`, read-only)

| Package | Change | Kind | Repos | PRs |
|---|---|---|---|---|
| `body-parser` | 2.3.0 → 2.4.0 | minor/patch | 8 | 16 |
| `zod` | 3.25.76 → 4.6.7 | major | 8 | 10 |
| `zod` | 3.25.76 → 4.6.6 | major | 7 | 7 |
| `undici` | 8.11.2 → 8.12.3 | minor/patch | 1 | 1 |

34 open PRs and 4 kinds of updates, the same as the #256 survey. Closing was not run (we will do it after grouped PRs open and the user confirms).

## Verification

- `node --test scripts/test/dependency-prs.test.mjs`: 6 passed
