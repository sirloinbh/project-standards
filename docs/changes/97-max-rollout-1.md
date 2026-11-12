# #97 Raise maxRollout to 1

The user approved this on 2026-10-25. All prerequisite issues (#21, #55, #71, #86, #88, #94, #95) are closed, and the shared package devDependencies field was added first in PR #202.

## Change

| File | Content |
|---|---|
| `sync.config.json` | `maxRollout` 0 to 1. When this PR is merged to main, `sync.yml` opens a sync PR in workout-memo (rollout 1) |
| `scripts/test/sync-pr.test.mjs` | The "token check only" case is now tested with a copy that has `maxRollout` 0 (it does not rely on the config file value) |
| `scripts/test/sync.test.mjs` | Fixed the wording of why study-log is left out of the plan to rollout 2 |
| `AGENTS.md`, `README.md` | Fixed the current phase description to be based on `maxRollout` 1 |

## What was decided

- The user merges the workout-memo sync PR (merging an app to main is a production deploy). The agent reviews the PR and records the result on #97.
- The sync PR does not change `package-lock.json`. Since devDependencies are added, CI that uses `npm ci` can fail until the lockfile is updated (#98, user approval).

## Checks

- `npm run check`: 401 of 403 tests passed, 2 skipped.
