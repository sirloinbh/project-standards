# #234 Open a manifest update PR even when only the managed file list changes

## Problem

`scripts/lib/sync-pr.mjs` treated a manifest-only change as a change that needs no PR and ended with `unchanged`. The intent was not to open a PR when only the central commit number changes, but it also skipped cases where the managed file list, packages, or registry values changed.

When `features.ui` of workout-memo was turned on (#233), the app PR (workout-memo#160) already contained the common files, so sync ended with `unchanged`, and the 36 common UI files were not registered in the workout-memo manifest. The standards check could not catch direct edits to those files.

## Change

| File | Content |
|---|---|
| `scripts/lib/sync-pr.mjs` | Compares the old and new manifests excluding `centralSha`, and opens a PR if they differ, even when all files are the same |
| `scripts/test/sync-pr.test.mjs` | Checks that a PR opens for a repo that has the common files but an old manifest (0 changed files, only the manifest committed), and that a later change of only the central commit gives `unchanged` |

## Verification

- The new test failed with `unchanged` before the fix and passed after it
- `npm run check`: passed (414 of 415 tests passed, 1 skipped, 0 failed)
- Impact check before merging: compared the manifests on main of the 9 repos with the manifests from `sync.mjs --dry-run`, excluding `centralSha`. Only workout-memo differs (36 common UI files added) and the other 8 are the same. After the merge, a sync PR opens only for workout-memo.
