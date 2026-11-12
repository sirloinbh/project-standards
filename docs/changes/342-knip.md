# #342 Clean up knip false positives and switch apps with zero findings to failing

## Change

| File | Content |
|---|---|
| `templates/app/knip.json` | Added the centrally managed files `.claude/**` and `backend/src/standard/**` to `ignore`, and removed the two patterns (`components/layout/**`, `lib/{utils,theme,api,use-notice}.ts`) that knip reported as "not needed" in all apps |
| `.github/workflows/reusable-app-ci.yml` | New input `knip-strict`. When off, it only warns as now; when on, it fails if knip has findings |
| `templates/app/.github/workflows/ci.yml.tmpl`, `registry/projects.schema.json`, `registry/projects.json` | `features.knipStrict` (all 8 start as `false`) |
| `scripts/test/knip.test.mjs` | Checks ignore, the two-stage condition, and that the value reaches both the caller and the expanded CI |

## Re-measuring the first results (2026-10-29, app `main`, new ignore)

| App | Result |
|---|---|
| health-log, life-journal, money-ledger, english-study, dev-career-portfolio | 1 finding: the `serviceTimeZone` export in `backend/src/app.ts` |
| plan-routine | The same 1 plus 3 app-specific exports |
| study-log | The same 1 plus 6 app-specific exports and 2 types |
| workout-memo | 29 app-specific (1 unused file, 15 exports, 10 types, 2 executables not in the list `tsc` and `tsx`, 1 `@lhci/cli`) |

- `serviceTimeZone` is used only inside `app.ts` in the 7 apps, so the export is not needed. The new app scaffold already uses the central `standard/http.ts`, so there is nothing to fix in the scaffold. Each app gets a PR that removes the `export`.
- The 5 apps whose PR has been merged (result 0) turn on `features.knipStrict` (separate PR).
- For `@lhci/cli`, knip will find where it is used once `lighthouserc.json` from #280 is synced.
- workout-memo `playwright.config.ts` fails to load if the test DB environment variable is missing. CI has `E2E_DATABASE_URL`, so there is no problem. When running knip locally, set `TEST_DATABASE_URL`.
- App-specific results (study-log, plan-routine, workout-memo) are handled in each app's issue.

## Checks

- `npm run check`: recorded in the PR body

## Apps switched to failing (2026-10-29)

- health-log, life-journal, money-ledger, english-study, dev-career-portfolio: the app PR that removed the `serviceTimeZone` export was merged and the result became 0. `features.knipStrict` was turned on.
- study-log, plan-routine, and workout-memo turn it on after their app-specific results are cleaned up.
