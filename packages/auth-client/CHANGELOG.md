# Changelog

## 1.1.0

- `createAuthMiddleware` sends the request's ID (`res.locals.requestId`, set by `requestLog`) to the auth service as `X-Request-Id` when it is a valid ID (`^[\w.-]{1,128}$`), so a failed session check (503) can be matched to the auth service's log (#1082). No header without an ID. No change to the options or the answers.

## 1.0.0

- First version (#566): `createAuthMiddleware` checks the shared session with the auth service and sets `req.user` (401 without a session, 503 when the auth service fails, successful checks cached), `meHandler` for `GET /api/me`, `fetchUser`, `createUseUser` (React hook from the app's own React), and `signInUrl` / `signOutUrl`. No dependencies and no peer dependencies.
