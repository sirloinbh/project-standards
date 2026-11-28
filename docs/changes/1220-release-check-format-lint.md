# #1220 Release check: run each app's format check and lint

Epic #1156. The design-system release check (#1178) passed v1.0.0 in all 8 apps, but the sync PR then failed the app `prettier --check` (#1219). The check now runs what the app CI runs on formatting and linting too.

## Changes — 2026-11-28

- `scripts/release-app-check.mjs`: the app steps are now install, `npm run format:check`, `npm run lint`, `npm run typecheck -w frontend`, `npm run test -w frontend`. The job summary names the failing step ("format check" or "lint") and the end of its output; the passed text lists the new steps.
- `.github/workflows/design-system-release-check.yml`: header comment updated; the job already calls the script, so there is no other change.
- `scripts/test/release-app-check.test.mjs`: the step order, and a test that a failing format check or lint stops the app and names the step.
