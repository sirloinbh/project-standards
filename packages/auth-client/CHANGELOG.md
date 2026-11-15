# Changelog

## 1.0.0

- First version (#566): `createAuthMiddleware` checks the shared session with the auth service and sets `req.user` (401 without a session, 503 when the auth service fails, successful checks cached), `meHandler` for `GET /api/me`, `fetchUser`, `createUseUser` (React hook from the app's own React), and `signInUrl` / `signOutUrl`. No dependencies and no peer dependencies.
