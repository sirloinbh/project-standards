# #910 Sync PR body names the repo-owned file that must adopt a changed managed helper

## Change

| File | Content |
|---|---|
| `scripts/lib/sync-pr.mjs` | `adoptionNotes(changes)` matches each changed or added file to `ADOPTION_RULES[].managedFile` (from `scripts/standards-check.mjs`, #906) and returns one line per rule: the helper and the repo-owned file. `renderBody` prints them under `## Impact` as plain notes, not checkboxes |
| `scripts/test/sync-pr.test.mjs` | The three current rules, files without a rule, an empty change list, and the body position |
| `docs/design.md` | The PR body description mentions the note |

## Why

The sync PR that carried `listenHost()` (#866) said nothing about `server.ts`, which is repo-owned and had to be changed by hand in 7 apps (#898). `standards-check` now warns (#906), but only after the merge; the PR is where the reviewer already looks.

## Limits

- The note is printed whenever the managed file changes, not only when the helper first arrives, because the helper may be added to a file the app already has (as `listenHost` was). It does not check whether the app already uses it; `standards-check` does that.
- `ADOPTION_RULES` stays in `standards-check.mjs`; this change only reads it.

## Checks

- `npm run check`: see the PR.
