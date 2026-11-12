# #113 Raise maxRollout to 2

The user approved this on 2026-10-26. The prerequisite issues #98 (approve the workout-memo lockfile and merge the sync PR) and #99 (pre-cleanup of the other 7 apps) are closed.

## Change

| File | Content |
|---|---|
| `sync.config.json` | `maxRollout` 1 → 2. When this PR is merged to main, `sync.yml` opens sync PRs in the 7 apps (study-log, health-log, life-journal, money-ledger, english-study, plan-routine, dev-career-portfolio) |
| `scripts/test/sync.test.mjs` | Changed the expected value so study-log is in the plan, and also check that the infrastructure repo (rollout 3) is left out |
| `AGENTS.md`, `README.md` | Updated the current-phase text to match `maxRollout` 2 |

## Decisions

- The user merges the 7 app sync PRs (merging an app to main is a production deploy). The agent reviews the PRs and records the result on #113.
- The sync PR does not change `package-lock.json`. Shared-package devDependencies are added, so CI that uses `npm ci` can fail until the lockfile is updated (#114, user approval). This is the same order as workout-memo (#97).

## Verification

- `npm run check`: passed (412 of 413 tests passed, 1 skipped, 0 failed)
