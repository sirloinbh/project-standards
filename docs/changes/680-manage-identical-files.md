# #680 Manage files that are already identical in all apps

## Change

| What | Where it lives now |
|---|---|
| The 12 files that are byte-equal in all 8 apps (after line-ending normalization): `scripts/contract.mjs`, `scripts/test/contract.test.mjs`, `scripts/test/claude-skills.test.mjs`, `backend/tsconfig.check.json`, `frontend/tsconfig.build.json`, `frontend/src/vite-env.d.ts`, `backend/.gitignore`, `backend/.dockerignore`, `frontend/.gitignore`, `frontend/.dockerignore`, `database/.gitignore`, `e2e/tsconfig.json` | Managed `full` templates under `templates/app/` (the `e2e/tsconfig.json` one under `templates/e2e/`, because it belongs to the e2e feature). The five that were in `scaffold/app/` moved with `git mv`; the others were new. Names that git or tooling would read as real config keep a `.tmpl` suffix |
| `frontend/vite.config.ts` | `templates/app/frontend/vite.config.ts.tmpl` with the port variables. Moved from the scaffold |
| `frontend/src/main.tsx` | `templates/app/frontend/src/main.tsx`: the form 7 of 8 apps already use (a missing `#root` does not throw), and the service worker registered through `service-worker.ts` |
| `frontend/src/service-worker.ts` (+ test) | `templates/ui/`. It was workout-memo's (#109): it registers `sw.js` and shows "A new version is available" with a Reload button. Now every app gets it; the notice text is generic (workout-memo's mention of a workout draft is dropped) |
| `frontend/src/test/standard-setup.ts` | `templates/vitest/`: jest-dom, the `matchMedia` and `ResizeObserver` stand-ins, the 8 s `asyncUtilTimeout`, and the clean-up after each test. The app's own `setup.ts` starts with `import './standard-setup';` and keeps only what is its own (the scaffold's `setup.ts` is now that one line) |
| `backend/test/standard/api.ts` (+ `backend/test/standard-api.test.ts`) | `templates/app/`: `withApi(app, run)` on a fetch-safe port, with `listenLocally` and `fetchBlockedPorts`. Apps pass `createApp(pool, options)` instead of the pool, so the helper has no app-specific imports. The test sits next to the `test/*.test.ts` glob |
| `scripts/lib/render.mjs` | `.dockerignore` gets the `#` managed header (one word in `HASH_STYLE`) |
| `templates/app/.prettierignore.tmpl` | The new managed files that Prettier would format |

## Compared with the apps

`npm run sync:preview` shows every new file for all 8 apps. For the 12 identical files the preview equals the app copies in every app (96 file and app pairs checked, ignoring the managed header and line endings).

`vite.config.ts` and `main.tsx` are not byte-equal in the apps today (Prettier layout, and `main.tsx` differs: workout-memo registers its own service worker module, the others call `navigator.serviceWorker.register`), so the first sync replaces them with the managed form. The issue text says they differ only in ports; that was true of `vite.config.ts` only.

## Follow-up for the apps (not part of this change)

- Each app's `src/test/setup.ts` can drop what `standard-setup.ts` now does and start with `import './standard-setup';` (study-log, health-log, workout-memo and dev-career-portfolio have extra lines of their own to keep).
- Each app's `backend/test/helpers.ts` can use `withApi` from `./standard/api.js` and drop its own port handling.
- workout-memo's own `service-worker.ts` is overwritten by the managed one when it syncs.

## Verification

- The new frontend files pass in a scratch copy (Vitest 5.0.3, jsdom): the service worker tests and a test of the standard setup (6 tests). The backend helper test passes with `tsx --test` (4 tests). Both type-check with `tsc --strict`. The central check does not run them.
