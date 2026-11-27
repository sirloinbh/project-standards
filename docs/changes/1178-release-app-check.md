# #1178 Check every design-system release against all apps before it ships

Epic #1156. A pin-raise PR (opened by the design-system release workflow, #1173) now fails when the release breaks an app, instead of the breakage showing up later in the app sync PRs (the 2026-11-27 date field case, #1142, #1145).

## Change

| File | Content |
|---|---|
| `.github/workflows/design-system-release-check.yml` | Runs on pull requests that change `versions.json`. `detect` decides whether the `design-system` pin changed and that the pinned commit has a green design-system `check`; `app (<name>)` matrix jobs (one per app, `fail-fast: false`) run the check; `design-system-release-check` is one always-present gate job for branch protection (skipped jobs count as passed) |
| `scripts/release-app-check.mjs` | `--pin-changed`, `--matrix`, `--verify-release`, and `--app <name> --work <folder>`: clones the app, renders this PR's sync files into it (the pinned release, same planner as the sync), then `npm install --ignore-scripts`, `typecheck -w frontend`, `test -w frontend`. A failure names the step and the last 40 lines in the job summary |
| `scripts/test/release-app-check.test.mjs` | Pin change detection, matrix, green-check gate, app steps, failure report, workflow shape |

## What it shows

The failing app jobs are listed in the PR checks by app name; the job summary says which step failed and why. No PR comment is written (the check never needs `pull-requests: write`).

## Showcase visual tests

The showcase visual and accessibility tests (#1186) run in design-system's own `check`. This workflow requires that `check` to be green on the pinned commit, so a release with failing showcase tests cannot move the pin.

## User steps

- Add `design-system-release-check` to the required checks of project-standards `main` (branch protection) so a failing release cannot merge.
- The apps are public, so the clones need no token. The shared packages are installed with the job token (`packages: read`), like the app CI; if an app's package access rejects it, tell the coordinator.

## Not covered

Backend tests, lint and e2e of the apps. The kit only affects the frontend, and the app sync PRs still run each app's full CI.

## Checks

`node --test scripts/test/release-app-check.test.mjs`, `npm run check`: passed.
