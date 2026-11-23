# #1082 Send the request ID to the auth service from auth-client

- Issue: [#1082](https://github.com/sirloinbh/project-standards/issues/1082), epic #1051
- Branch: `feat/1082-auth-client-request-id`
- Related: #1060 (`docs/research/tracing-metrics.md`)

## Changes — 2026-11-23

- `@sirloinbh/auth-client` 1.1.0: `createAuthMiddleware` sends `res.locals.requestId` (set by `requestLog`) to the auth service as `X-Request-Id` when it matches `^[\w.-]{1,128}$`; nothing is sent without an ID or with an invalid one. Options and answers are unchanged.
- CHANGELOG, README and `docs/logging.md` updated.
- `versions.json` stays at 1.0.0 until the release exists: the tag `auth-client/v1.1.0` is a user step, and a follow-up PR raises the version after `publish.yml` succeeds.

## Verification

- `node --test scripts/test/auth-client.test.mjs`
- `npm run check`
