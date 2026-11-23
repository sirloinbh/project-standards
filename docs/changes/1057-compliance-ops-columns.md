# #1057 Add operations columns and a daily trend to the compliance report

- Issue: [#1057](https://github.com/sirloinbh/project-standards/issues/1057)
- Branch: `feat/1057-compliance-ops`
- Parent: #1051 Operations visibility and recovery checks

## Changes — 2026-11-23

- `scripts/lib/ops.mjs`: reads the last completed CI run on main, open Dependabot and code scanning alerts, the commit time of the head of main (deploy proxy) and the oldest open PR (PRs marked "do not merge" skipped). Each value is read on its own, so a missing permission blanks only that value (`?`). Also the history helpers: `countItems`, `updateHistory`, `renderTrend`.
- `scripts/compliance.mjs`: `remoteStatuses` collects the values for every target; `--apply` reads the previous `docs/compliance-history.csv` from the central repo, adds today's line, and publishes it with the report PR.
- `docs/compliance.md`: four new columns (CI on main, Alerts, Last main merge, Oldest open PR) and a "Trend (last 14 days)" section.
- `docs/repo-settings.md`: the API and App permission behind each column, the deploy-time decision, and the user step.

## Decision

Deploy time = merge time of the head of main (needs only Contents read). A deployment record or a deploy ping are follow-ups; the choice was sent to the coordinator.

## User step

The CI column needs the App permission Actions: read-only and the Dependabot column needs Dependabot alerts: read-only. Until the user grants them in the App settings and accepts them on the installation, those columns show `?`.

## Verification

- `node --test scripts/test/ops.test.mjs scripts/test/compliance.test.mjs scripts/test/epics.test.mjs scripts/test/repo-settings.test.mjs`: 30 passed, with fake API answers (failing CI, unreadable code scanning alerts, no runs, do-not-merge PRs, history replace and 14-day window).
- `npm run check` passes (see the PR).
