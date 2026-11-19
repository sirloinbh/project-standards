# 750: start the e2e backend in explicit test auth mode

## What changed

- `templates/e2e/playwright.config.ts.tmpl`: the backend `webServer` env now has `AUTH_DISABLED: '1'`, with a comment that the e2e API runs without the shared sign-in and the mode is explicit.
- `scripts/test/e2e-auth-mode.test.mjs` (new): the e2e backend env sets an explicit local mode and no fake `AUTH_INTERNAL_URL`, and `auth.ts` accepts `AUTH_DISABLED=1` as local.

## Why

#667 (PR #722) makes `sharedAuth()` refuse to start without `AUTH_INTERNAL_URL` unless the mode is explicitly local (`NODE_ENV=development|test` or `AUTH_DISABLED=1`). The e2e Playwright config started the API with only `DATABASE_URL`, `PORT` and `TZ`, so every app's e2e job failed with "AUTH_INTERNAL_URL is required" once it received the new `auth.ts` (the sync PRs on the #698 branches).

## Decision

`AUTH_DISABLED=1`, not `NODE_ENV=test` and not a made-up `AUTH_INTERNAL_URL`. It changes only the sign-in rule, so nothing else that reads `NODE_ENV` (logging, error output) behaves differently in e2e, and no fake URL reaches a production path. The e2e API still listens on `127.0.0.1` only (the managed server binds there in local mode).

## Impact

Each app with `features.e2e` gets the new `playwright.config.ts` in its next sync PR. Before #667 the e2e API also ran without sign-in, so the e2e behavior is unchanged.

## Tests

`npm run check`; `node --test scripts/test/e2e-auth-mode.test.mjs`.
