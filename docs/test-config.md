# Test config templates (Playwright, Vitest)

These are workout-memo's test configs made into centrally managed files (#33). They are synced only to apps whose registry feature flag is on, because putting them in an app that lacks the dependencies would break type checking.

| Managed file | Source | Flag that turns it on | Value that differs per project |
|---|---|---|---|
| `playwright.config.ts` | `templates/e2e/playwright.config.ts.tmpl` | `features.e2e` | e2e API port (`ports.e2eApi`), e2e web port (`ports.e2eWeb`) |
| `frontend/vitest.config.ts` | `templates/vitest/frontend/vitest.config.ts.tmpl` | `features.vitest` | None |

- The ports are registry values set by the slot formula in [ADR-0006](adr/0006-port-slot-allocation.md). They do not overlap with the dev servers (`api`, `vite`), so e2e can run while the dev servers are on.
- `features.e2e` also turns on the e2e job in CI (`reusable-app-ci.yml`).
- If `features.e2eVisual` is also on, CI runs e2e in the container for `images.playwright` in `versions.json` (pinned by digest) with `E2E_VISUAL=1` and also compares screenshots (#203). On failure it uploads the `playwright-report` and `visual-baselines` artifacts, which hold baseline image candidates. This container has no `psql`, so a `db:migrate` runner must exist. Match the image version to the app's `@playwright/test` version. Currently only workout-memo has it on.
- Both files are in the central section of `.prettierignore`, because formatting them in an app would fail the hash check (#154).
- Currently only workout-memo has both flags on. A new project made by the scaffold is registered with both flags on from the start. The scaffold's `package.json` includes the dependencies below and the e2e starter files.

## What the templates expect

Playwright config (`features.e2e`):

- Test files go in the `e2e/` folder. If `e2e/tsconfig.json` includes `../playwright.config.ts`, the root `npm run typecheck` also checks the config file.
- The backend `backend/src/server.ts` reads the `PORT` and `DATABASE_URL` environment variables and responds on `/api/health`.
- The frontend `npm run dev` (Vite) proxies `/api` to `API_PROXY_TARGET`.
- Set `E2E_DATABASE_URL` or `TEST_DATABASE_URL` to a test DB prepared with `db:migrate`. Do not use a personal DB.
- The browser is the Chrome installed on the PC (`channel: 'chrome'`). No browser is downloaded. Only when `E2E_VISUAL=1` is the screenshot comparison done with the Chromium inside the Playwright container.
- Put `"test:e2e": "playwright test"` in the root `package.json`, and `test-results/` and `playwright-report/` in the project section of `.gitignore`.

Vitest config (`features.vitest`):

- Test files are `frontend/src/**/*.test.{ts,tsx}`.
- `frontend/src/test/setup.ts` must exist (a project-owned file. Use the scaffold's file as a starting point).
- Put `"test": "vitest run"` in `frontend/package.json`.
- The time limit for one test is 15 seconds (`testTimeout`, #390). When other work ran on the same PC, tests hit the 5-second limit and failed regardless of the code.

## Dependencies needed when another app adopts them

These are the versions installed in workout-memo's `package-lock.json` (2026-10-22). No new versions are brought in.

**Installing new packages is done by the user directly, after user approval.** The only install command an agent can run is `npm ci`, which installs exactly what the lockfile says (#375). Approved installs are also done with `--ignore-scripts` ([dependency policy](dependency-policy.md)), and the lockfile changes and the `ioc-scan` result are written in the app PR.

| Flag | Location | Package | Version | Used for |
|---|---|---|---|---|
| vitest | `frontend` devDependencies | `vitest` | 5.0.3 | `vitest.config.ts`, running tests |
| vitest | `frontend` devDependencies | `jsdom` | 30.1.2 | `environment: 'jsdom'` |
| vitest | `frontend` devDependencies | `@testing-library/react` | 16.3.3 | Screen tests, `cleanup` in `setup.ts` |
| vitest | `frontend` devDependencies | `@testing-library/dom` | 10.4.2 | Peer of `@testing-library/react` |
| vitest | `frontend` devDependencies | `@testing-library/jest-dom` | 7.0.1 | `toBeInTheDocument` and others in `setup.ts` |
| e2e | root devDependencies | `@playwright/test` | 1.63.0 | `playwright.config.ts`, `npm run test:e2e` |
| e2e | root devDependencies | `@axe-core/playwright` | 4.13.0 | Accessibility check. Used by the scaffold's `e2e/overview.spec.ts` |
| e2e | root devDependencies | `@types/node` | 24.19.2 | `types: ["node"]` in `e2e/tsconfig.json` |
| e2e | `backend` devDependencies | `tsx` | 4.23.15 | `npx --no-install tsx backend/src/server.ts` in `webServer` |

- workout-memo uses `@testing-library/user-event` (14.6.7), but the templates and common UI tests do not need it. Bring it in only when an app uses it.
- `vite`, `typescript`, and `react`, which are not in the table, are already in every app. Major versions follow the unification table in the [dependency policy](dependency-policy.md).
- A backend that already has `tsx` is left as is.

## Order for turning them on in an app

1. Open an issue in the app repo, list the packages in the table above, and get user approval.
2. The user installs them. Add project-owned files such as `setup.ts`, the `e2e/` tests, and the `test:e2e` script in the app PR.
3. In the central repo, open a PR that changes that app's `features.vitest` or `features.e2e` in `registry/projects.json` to `true`. The config files come in with the next sync PR.

## Accessibility and performance scores (Lighthouse CI, #280)

Apps with the registry `features.lighthouse` on (currently workout-memo) receive `lighthouserc.json`. The common CI `verify` job measures `frontend/dist`, built by `npm run check`, with Lighthouse CI (`@lhci/cli`) and writes the scores to the job summary. Scores below the thresholds (accessibility 0.9, best practices 0.9, performance 0.8) only produce a warning. The report is kept for 7 days in the `lighthouse-report` artifact. The detailed decision is in the [change record](changes/280-lighthouse.md).

## Screen tests without a backend (MSW contract mock, #281)

Apps with the registry `features.msw` on (currently workout-memo) receive `frontend/src/test/contract-api.ts`. When a test file calls `setupContractApi()`, MSW answers every API in `docs/openapi.json`, and a request not in the contract fails the test. Data is supplied per test with `contractHandlers({ 'GET /api/…': … })`. If the contract has no success response schema, the body is empty, so list screens give a default such as `setupContractApi({ emptyBody: [] })`. Details are in the [change record](changes/281-msw.md).
