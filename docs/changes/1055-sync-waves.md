# #1055 Roll sync out in waves: canary repos first

- Issue: [#1055](https://github.com/sirloinbh/project-standards/issues/1055), epic #1050
- Branch: `feat/1055-sync-waves`

## Changes — 2026-11-23

- `sync.config.json` / schema: optional integer `wave` per target (no value = last wave). Wave 1: `workout-memo`, `file-control` (the most complete app plus a non-app repo). Wave 2: the other 7 apps and `develop-skill`. No wave: `shared-aws-infrastructure`, `shared-auth`, `shared-ai`, so the repos with the widest reach go last.
- `scripts/lib/sync-waves.mjs`: grouping, check-run classification, and `waitForChecks` (polls every 30 s, 20 minutes per wave; a PR with no check run at all is treated as green after 3 minutes).
- `scripts/sync.mjs`: `apply` syncs one wave at a time. A red check, a timeout, an unreadable check list, or a sync error in a wave stops the run: later repos get status `held`, a `::warning::` is logged, a comment goes on the central PR that was merged, and the run exits 1. `allWaves` (env `SYNC_ALL_WAVES`) skips the waiting.
- `sync.yml`: `workflow_dispatch` input `all_waves`, a 120-minute job timeout.
- `npm run sync:preview` prints targets in wave order with `wave N:` and `plan.json` carries `wave`.
- Docs: `docs/design.md` (5.3), `.claude/rules/sync-and-deploy.md`.

## Not done here

- The compliance report "held by wave" column is in `scripts/compliance.mjs`, which another lane owns this round; filed as a follow-up under #1050.
- Reading check runs needs the sync App permission **Checks: Read** (user step). Without it the first wave is reported as "could not read checks" and later waves are held, which is the safe direction; `all_waves` still works.

## Verification

- `node --test scripts/test/sync-waves.test.mjs`: 9 passed (wave order, wave 2 synced on green, held on red, held on timeout, held on sync error, all-waves override).
