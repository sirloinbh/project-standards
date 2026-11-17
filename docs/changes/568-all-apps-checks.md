# #568 / #569 Turn on e2e and Lighthouse for the other 6 apps

## Change

| File | Content |
|---|---|
| `registry/projects.json` | health-log, life-journal, money-ledger, cert-manager, plan-routine, dev-career-portfolio: `features.e2e` and `features.lighthouse` on (study-log was the pilot in #632) |
| `scripts/test/lighthouse.test.mjs` | The Lighthouse app list is all 8 apps |
| `docs/test-config.md`, `docs/tools.md` | Text says all 8 apps |
| `scripts/test/fixtures/sync-snapshot.json` | Files each app now receives |

## Decisions

- The app PRs that install `@lhci/cli`, `@playwright/test`, `@axe-core/playwright` and add `e2e/smoke.spec.ts` are merged first (study-log#239, health-log#174, life-journal#118, money-ledger#163, cert-manager#123, plan-routine#134, dev-career-portfolio#119). The knip config fix came in #633.
- `e2eVisual` stays off; OpenAPI (#570) is a separate step.
- A failing e2e or Lighthouse run in a sync PR is fixed with a commit on that PR.

## Verification

- `npm run check`: recorded in the PR body
