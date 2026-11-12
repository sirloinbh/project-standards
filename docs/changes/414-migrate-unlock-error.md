# #414 Migration runner: when the connection drops, the unlock error hides the original error

Found by reading the code in the second review of health-log PR #94 (#53).

## Problem

`migrate()` in `scaffold/app/backend/src/migrations.ts` ran `pg_advisory_unlock` in `finally`. If the DB connection dropped while applying a file, the unlock also failed for the same reason, and that error overwrote `"<파일> 적용 실패: <원인>"` ("<file> failed to apply: <cause>", the original message is Korean). The exit code is 1 either way, but the log did not show which file failed.

## Change

| File | Content |
|---|---|
| `scaffold/app/backend/src/migrations.ts` | If applying fails, an unlock failure is ignored and the original error is thrown. An unlock failure after success is still kept as an error as now. The apply part was pulled out into `applyPending()` |
| `scaffold/app/backend/test/migrations.test.ts` | Checks "connection lost during apply" and "unlock after success / unlock failure" with a fake connection |

When the connection drops, PostgreSQL releases the session's advisory lock, so ignoring the unlock failure does not leave the lock behind.

## Checks

- Scaffold tests run in a generated app with `tsx`. Dependencies are not installed in this repo, so I copied the runner and the test to a temporary folder and ran them with Node's built-in TypeScript execution (`node --test`, only the import extension changed to `.ts`).
  - Changed runner: all 7 passed
  - Runner before the change (`origin/main`): the new test "connection is lost" failed with `Connection terminated unexpectedly`, which reproduced the problem
- `npm run check`: the result is written in the PR body.

## Applying to apps

`scaffold/` is used only for a new app's first commit and is not synced. As of 2026-11-08, the app repos below have the same code (unlock in `finally`), so each must be fixed separately in its own repo.

- workout-memo, study-log, health-log, life-journal, plan-routine: `backend/src/migrations.ts`
- money-ledger, cert-manager, dev-career-portfolio: no such file
