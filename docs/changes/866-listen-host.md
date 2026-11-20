# #866 Managed listenHost: bind the API to 127.0.0.1 without a sign-in

## Change

- `templates/app/backend/src/standard/auth.ts` (managed): new `listenHost(authEnabled, env)`. `HOST` wins; otherwise `0.0.0.0` with the shared sign-in and `127.0.0.1` without it. It sits next to `sharedAuth()` instead of a new file, so no new managed path and no sync snapshot change.
- `scaffold/app/backend/src/server.ts` uses it and logs the real address.
- `scripts/test/backend-auth.test.mjs`: four cases (auth on, auth off, `HOST` overrides both ways).

## Reason

Only the scaffold kept the unauthenticated API on 127.0.0.1; 7 of 8 app `server.ts` files still pass `'0.0.0.0'` (study-log#261 found it first).

## Follow-up

- Each app changes its `server.ts` to `const auth = sharedAuth(); .listen(port, listenHost(auth !== undefined), ...)` in its next sync follow-up. Compose sets `AUTH_INTERNAL_URL`, so containers still listen on all interfaces. No app PR is opened from this issue.
