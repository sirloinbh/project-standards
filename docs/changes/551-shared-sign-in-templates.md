# #551 Shared sign-in templates for every app

## Change

- `versions.json` `packages`: `@sirloinbh/auth-client` 1.0.0. `templates/index.json` puts it in the managed `dependencies` of `frontend/package.json` and `backend/package.json`.
- New managed files, taken from the workout-memo pilot (workout-memo#303, PR #310):
  - `templates/app/backend/src/standard/auth.ts`: `sharedAuth()` builds the session check from `AUTH_INTERNAL_URL` and refuses to start in production without it.
  - `templates/ui/frontend/src/sign-in.tsx`: `SignInGate` and `AccountActions`.
  - `templates/ui/frontend/src/auth-origin.ts` and its test: `auth.<domain>`, or null on local and IP addresses.
- `templates/app/.prettierignore.tmpl`: the three frontend files.
- The package is not in the sync profile `packages` yet: that list makes `standards-check` require it installed, so it joins once all 8 apps have it (as design-tokens did in #126).

## Follow-up: the loading spinner

- `templates/ui/frontend/src/sign-in.tsx`: while the session is checked, the shared `Spinner` sits beside the status line in an `aria-busy` region named "Sign-in check", as workout-memo added in workout-memo#317 after the template was taken. Without it, the sync would have removed that spinner from workout-memo and broken its `sign-in.test.tsx`.

## What each app adds after its sync PR

The sync PR changes `package.json`, so its lockfiles need `npm install --ignore-scripts` (user step) and `npm run lockfiles:sync`. Then, in the app's own PR:

1. `backend/src/app.ts`: `createApp(pool, { auth })`; `if (options.auth) app.use('/api', options.auth)` before every route; `app.get('/api/me', meHandler)`.
2. `backend/src/server.ts`: `createApp(pool, { auth: sharedAuth() })`.
3. `compose.yaml` api: `AUTH_INTERNAL_URL: ${AUTH_INTERNAL_URL:-http://shared-auth-api:3110}`, `networks: [default, shared-auth]`, and `networks: { shared-auth: { external: true } }`.
4. `frontend/src/app.tsx`: wrap the app in `<SignInGate>` and pass `<AccountActions />` to `AppShell` `actions`.
5. API docs and OpenAPI: `GET /api/me`, 401 and 503.

## Verification

- `npm run check` passes (596 tests, 591 pass, 0 fail, 5 skipped). `UPDATE_SNAPSHOT=1 npm test`: the snapshot adds `backend/src/standard/auth.ts` and the three frontend files for all 8 apps.
