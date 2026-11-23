# @sirloinbh/auth-client

Signs every sirloinbh app in through the shared auth service at `auth.<root domain>` ([ADR-0015](../../docs/adr/0015-shared-sign-in.md)). The package imports nothing: the backend uses Node's `fetch`, and the frontend passes in its own React hooks.

## Backend (Express)

```ts
import { createAuthMiddleware, meHandler } from '@sirloinbh/auth-client';

// AUTH_INTERNAL_URL is the auth service on the private Docker network shared-auth,
// never the public address (the firewall does not let the server reach itself).
app.use('/api', createAuthMiddleware({ authUrl: process.env.AUTH_INTERNAL_URL! }));
app.get('/api/me', meHandler);
```

- Forwards only the shared session cookies (`sirloinbh.session_token`, `sirloinbh.session_data`, with or without `__Secure-`) to `GET <authUrl>/api/auth/get-session`.
- Sends the request's ID (`res.locals.requestId`, set by `requestLog`) to the auth service as `X-Request-Id` when it is a valid ID, so a failed check can be matched to the auth service's log (since 1.1.0).
- No session, or the auth service says the session is gone: `401 {"error":"unauthorized"}`.
- Auth service unreachable, slow (`timeoutMs`, default 3 s), or failing: `503 {"error":"auth_unavailable"}`. A request is never let through without a check.
- A successful check is reused for `cacheMs` (default 30 s), so a sign-out reaches every app within that time.
- `publicPaths` (default `['/api/health']`) need no session, so the deploy and health checks keep working.

## Frontend (React)

```tsx
import { useEffect, useState } from 'react';
import { createUseUser, signInUrl, signOutUrl } from '@sirloinbh/auth-client';

const useUser = createUseUser({ useState, useEffect });
const AUTH = import.meta.env.VITE_AUTH_ORIGIN; // https://auth.daysofme.com

export function UserMenu() {
  const { status, user } = useUser();
  if (status === 'signed-out') window.location.assign(signInUrl(AUTH, window.location.href));
  if (status !== 'signed-in') return null;
  return <a href={signOutUrl(AUTH, window.location.origin)}>{user.name ?? user.email}</a>;
}
```

`useUser` calls the app's own `GET /api/me` (same origin, no CORS) and returns `{ status, user }` with `status` one of `loading`, `signed-in`, `signed-out`, `error`.

## What the auth service must provide (#550)

| Path | Use |
|---|---|
| `GET /api/auth/get-session` | Better Auth's session endpoint: `{ user, session }` or `null` |
| `GET /sign-in?returnTo=<url>` | Sign-in page (GitHub, Google); returns to `returnTo` on the same parent domain |
| `GET /sign-out?returnTo=<url>` | Ends the session for every app, then returns to `returnTo` |
