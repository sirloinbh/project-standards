# #566 @sirloinbh/auth-client package

## Change

| File | Content |
|---|---|
| `packages/auth-client/` | New package 1.0.0: `createAuthMiddleware`, `meHandler`, `fetchUser`, `createUseUser`, `signInUrl`, `signOutUrl`, `sessionCookies`, with TypeScript declarations, README, and CHANGELOG |
| `scripts/test/auth-client.test.mjs` | Tests with a fake auth service |
| `scripts/test/packages.test.mjs`, `docs/design.md` | Five packages |

## Design

- Like `@sirloinbh/eslint-config`, the package imports nothing. The backend uses Node's global `fetch`; the frontend builds the hook from the app's own `useState` and `useEffect`. So it has no dependencies and no peer dependencies, and it passes package-guard.
- The backend asks the auth service over the private `shared-auth` Docker network (ADR-0015) and forwards only the shared session cookies.
- No session gives 401. A failing or unreachable auth service gives 503, so requests are never let through unchecked. Successful checks are cached for 30 seconds, so a sign-out reaches every app within that time.
- The frontend asks the app's own `GET /api/me` (same origin), so the auth service needs no CORS for the apps.
- The README lists the paths the auth service must provide (#550): `/api/auth/get-session`, `/sign-in?returnTo=`, `/sign-out?returnTo=`.

## Not in this change

- `sync.config.json` and `versions.json` get the package only after the first release, because apps cannot install a version that is not published yet (design.md 4.3).

## Release steps [User]

1. Push the tag `auth-client/v1.0.0` (`publish.yml` publishes it).
2. GitHub profile → Packages → `auth-client` → Package settings → Manage Actions access → add the app repos with Read, as for the other packages ([user-steps.md](../user-steps.md)).
3. The agent then adds it to `versions.json` and `sync.config.json` together with the workout-memo pilot (#550).

## Verification

- `npm run check`: recorded in the PR body
