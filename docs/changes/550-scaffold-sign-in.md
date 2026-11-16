# #550 New apps start behind the shared sign-in

## Change

| File | Content |
|---|---|
| `scaffold/app/backend/src/app.ts` | `createApp(pool, { auth })` mounts the auth middleware on `/api` before any route and adds `GET /api/me` (`meHandler`) |
| `scaffold/app/backend/src/server.ts` | Builds the middleware with the managed `sharedAuth()` from `standard/auth.ts` |
| `scaffold/app/backend/test/sign-in.test.ts` | 401 without a session (except `/api/health`), `/api/me` with one |
| `scaffold/app/frontend/src/app.tsx` | Wraps the shell in `SignInGate` and shows `AccountActions` in the top bar (both managed, from `templates/ui`) |
| `scaffold/app/compose.yaml` | The API gets `AUTH_INTERNAL_URL` and joins the external `shared-auth` network |
| `scaffold/app/.env.example` | New `AUTH_INTERNAL_URL` key, empty for local development |
| `scripts/test/scaffold.test.mjs` | The rendered scaffold has the middleware, the gate, the network, and the env key |

## Reason

- workout-memo is the pilot (workout-memo#310) and the other 7 apps follow in #551, but a new app made from `scaffold/app/` started with an open API. The middleware and gate were already managed templates; only the scaffold did not use them.

## Design

- The scaffold follows workout-memo: no `AUTH_INTERNAL_URL` means local development runs open, and production refuses to start without it.
- The `@sirloinbh/auth-client` dependency, `standard/auth.ts`, `sign-in.tsx`, and `auth-origin.ts` come from the sync (`templates/index.json`, `templates/app`, `templates/ui`), not from the scaffold, so they stay in one place.
- Locally, `docker compose up` needs the external network: run shared-auth first or `docker network create shared-auth` once (a comment in `compose.yaml` says so).

## Verification

- `node --test scripts/test/scaffold.test.mjs`: 12 tests pass, including the rendered tree's standards-check.
- All `npm run check` steps pass: 600 tests (595 pass, 5 skipped), registry, docs, tokens, plugin, packages, workflows, and secrets checks. A first run through `npm run` had seven deploy-template shell tests fail on this Windows PC (bash environment); they passed when the test files were run directly, with and without this change.
