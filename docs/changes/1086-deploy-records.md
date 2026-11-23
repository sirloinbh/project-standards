# #1086 Read GitHub deployment records for the deploy column

- Issue: [#1086](https://github.com/sirloinbh/project-standards/issues/1086)
- Branch: `feat/1086-deploy-records`
- Parent: #1051 Operations visibility and recovery checks
- Related: #1057 (the columns), #1087 (autodeploy writes the records, not done here)

## Changes — 2026-11-23

- `scripts/lib/ops.mjs`: `lastDeployment` reads the newest `success` status of the 5 newest `production` deployments. The column "Last deploy" shows it; without a record it shows the main head commit time labelled "main merge, no deploy record" (also when the API is unreadable).
- `docs/github-app.md`, `docs/adr/0002-*.md`, `docs/repo-settings.md`: the App permissions Actions, Dependabot alerts and Deployments (read-only) are listed as not granted yet; the old "do not grant Actions" line now says it is read-only and only for the CI column.
- `scripts/test/ops.test.mjs`: a record wins, a failed-only status falls back, an unreadable API falls back.

## User step

Add Actions, Dependabot alerts and Deployments (all read-only) to the sync App and accept them on the installation. Until then CI and Dependabot show `?` and the deploy column uses the fallback.

## Verification

- `npm run check` passes (see the PR).
