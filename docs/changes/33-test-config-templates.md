# #33 Test config templates (Playwright, Vitest)

## Change

| File | Content |
|---|---|
| `templates/e2e/playwright.config.ts.tmpl` | Based on workout-memo `playwright.config.ts`. Fills in the e2e API and web ports from the registry `ports.e2eApi` and `ports.e2eWeb` |
| `templates/vitest/frontend/vitest.config.ts.tmpl` | Same content as workout-memo `frontend/vitest.config.ts` (jsdom, `src/**/*.test.{ts,tsx}`, `src/test/setup.ts`, `TZ=UTC`) |
| `registry/projects.schema.json`, `projects.json` | Added `features.vitest`. Only workout-memo is `true`. Added a description to `features.e2e` |
| `sync.config.json` | Added the `e2e` and `vitest` folders to `featureTemplates` |
| `templates/app/.prettierignore` | Added the two config files (#154 rule) |
| `scaffold/app/playwright.config.ts`, `scaffold/app/frontend/vitest.config.ts` | Deleted. The templates now produce the same files (the scaffold also renders centrally managed files) |
| `docs/test-config.md` | What the templates expect, the dependency list other apps need when adopting them, and the order for enabling them in an app |
| `scripts/test/test-config.test.mjs` | 5 tests: that the e2e API and web ports are filled in for all 8 apps, that only apps with the flag enabled get them in the plan, and that the dependency list versions match the scaffold |
| `scripts/test/sync.test.mjs` snapshot, `templates.test.mjs`, `scaffold.test.mjs` | Two files added for workout-memo, the new folders included in the #154 check, and `vitest: true` for the slot 99 virtual project |
| `README.md`, `docs/design.md` 6.6 | Document links, and new projects are registered with `features.e2e`, `vitest`, and `ui` turned on |

## Decisions

- **The registry feature flag decides applicability.** Playwright uses the existing `features.e2e` (the CI e2e job uses the same value). Only workout-memo uses Vitest, so I created `features.vitest`. Adding a config file to an app without the dependencies would break type checking because `vitest/config` and `@playwright/test` cannot be found. This is the same approach as `features.ui` (#123).
- **I kept workout-memo's screenshot comparison settings in the template.** `E2E_VISUAL`, `snapshotPathTemplate`, `updateSnapshots`, and `expect.toHaveScreenshot` have no effect on apps without screenshot tests. Removing them would make the first sync break workout-memo's screenshot comparison. The only differences from workout-memo are the managed header and three comment lines (added a note on the port source, and removed the app issue number `#113` and the mention of the `workout-testing` skill).
- **I deleted the scaffold copies.** Two sources for the same file would drift apart. The scaffold also writes centrally managed files through `planTarget`, so a new project with the flag enabled gets the same file from the template. Existing 8 apps do not rewrite the scaffold.
- The dependency list versions use only the versions installed by the workout-memo lockfile (= the scaffold `package.json`). A test checks that the two places match. Installs are done by the user after approval.

## Checks

- `npm run check` passed: 171 tests (170 passed, 1 skipped, 0 failed), `registry-check: ok`, `docs/projects.md: up to date`, `package-guard: ok`, `check-workflows: ok`.
- I compared the rendered output with workout-memo's current two files (read through the API). `vitest.config.ts` is the same apart from the header, and `playwright.config.ts` differs only in the comments noted above. The ports 3201 and 5301 are the same.
