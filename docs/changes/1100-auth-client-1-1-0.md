# #1100 Raise @sirloinbh/auth-client to 1.1.0 in versions.json

## Why

#1082 (PR #1093) made auth-client send the caller's request ID to the auth service. The user pushed `auth-client/v1.1.0` on 2026-11-24 and `publish.yml` (run 45270353905) published 1.1.0. Apps only get it once `versions.json` pins it.

## Changes

| File | Change |
|---|---|
| `versions.json` | `@sirloinbh/auth-client` 1.0.0 → 1.1.0 (own package: provenance instead of the 14-day rule, ADR-0004) |
| `docs/versions.md` | Regenerated (`npm run docs`) |
| `scripts/test/templates.test.mjs` | The expected auth-client version comes from `versions.json` instead of a hard-coded `1.0.0`, like design-tokens |

## Tests

- `node --test scripts/test/templates.test.mjs`: 19 pass, 0 fail
- `npm run check`: see the PR

## Notes

- The sync PRs raise the dependency in each app's frontend and backend `package.json`; the app's lockfile update follows the usual sync PR flow.
- The request ID only lines up end to end once shared-auth keeps the incoming `X-Request-Id` (sirloinbh/shared-auth#64).
