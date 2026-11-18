# #667 Refuse silent sign-in-free API starts outside local development

## Change

- `templates/app/backend/src/standard/auth.ts`: `sharedAuth()` without `AUTH_INTERNAL_URL` now returns `undefined` only when `NODE_ENV` is `development` or `test`, or `AUTH_DISABLED=1`, and logs one warning line. Every other value (unset, `staging`, a typo, `production`) throws. Before, only the exact value `production` threw, so a missing or mistyped `NODE_ENV` left the API open and silent.
- `scaffold/app/backend/src/server.ts`: when sign-in is off, the server listens on `127.0.0.1` instead of `0.0.0.0`. Apps with their own `server.ts` should do the same (life-journal already does).
- `scripts/test/backend-auth.test.mjs` (new): unset, `''`, `staging`, `prod`, `Development`, `production` throw; `development`, `test`, `AUTH_DISABLED=1` return undefined with one warning; a set URL always returns the middleware.
- `scripts/test/scaffold.test.mjs`: checks the new bind.

## Local development

`tsx watch --env-file-if-exists=../.env` does not set `NODE_ENV`, so a local API without `AUTH_INTERNAL_URL` now stops with a message naming the fix. Add `NODE_ENV=development` (or `AUTH_DISABLED=1`) to the app's own `.env`. Compose and the Dockerfile keep `NODE_ENV=production`, where `AUTH_INTERNAL_URL` is set.
