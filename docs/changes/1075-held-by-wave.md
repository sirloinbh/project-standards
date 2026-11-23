# #1075 Show repos held by a sync wave in the compliance report

- Issue: [#1075](https://github.com/sirloinbh/project-standards/issues/1075)
- Branch: `feat/1075-held-by-wave`
- Parent: #1050 Safer standards rollout
- Related: #1055 (sync waves), #1068

## Changes — 2026-11-23

- `scripts/compliance.mjs`: for each target with an open sync PR, reads the check runs of its head commit and classifies them with `classifyChecks` from the wave gate (`red`, `pending`, `green`, `none`; unknown when the App cannot read them).
- `scripts/lib/compliance.mjs`: new column "Sync wave" shows each target's `wave` (`last` when none). `heldByWave` marks a repo `held by wave N` when a repo of an earlier wave has a sync PR with red CI and the repo itself has not reached the current central commit. The "Open sync PR" cell adds ", CI red".
- `docs/github-app.md`, `docs/adr/0002-*.md`, `docs/repo-settings.md`: the App permission Checks: read-only (not granted yet).
- `scripts/test/held-by-wave.test.mjs`: held cell, not-held cases, the column and the check-run read.

## User step

Add Checks: read-only to the sync App and accept it on the installation (together with Actions, Dependabot alerts and Deployments from #1086). Until then the wave gate warns and syncs on, and the report shows the wave but never "held by wave".

## Verification

- `npm run check` passes (see the PR).
