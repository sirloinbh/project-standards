# #568 / #569 Turn on e2e and Lighthouse for study-log (pilot)

## Change

| File | Content |
|---|---|
| `registry/projects.json` | study-log: `features.e2e` and `features.lighthouse` on |
| `scripts/test/lighthouse.test.mjs`, `scripts/test/agents.test.mjs` | The list of Lighthouse apps now includes study-log; the CI caller test reads study-log's e2e value from the registry |
| `scripts/test/fixtures/sync-snapshot.json` | Files study-log now receives: `playwright.config.ts`, `lighthouserc.json`, the e2e CI jobs |

## Decisions

- Order per app: the app PR installs `@lhci/cli`, `@playwright/test`, `@axe-core/playwright` and adds `e2e/smoke.spec.ts` with the flags still off (study-log#239); this PR turns the flags on; the sync PR then runs both in CI. Failures are fixed with a commit on the sync PR (not starting with `chore: sync central standards`).
- study-log is the pilot. The other 6 apps follow in one PR after their app PRs merge (#568, #569).
- `e2eVisual` stays off: visual baselines are a separate decision.

## Verification

- `npm run check`: recorded in the PR body
