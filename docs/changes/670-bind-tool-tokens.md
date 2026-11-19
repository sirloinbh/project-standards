# #670 Bind AI tool call tokens to one call

A token from shared-ai used to be valid for any tool and any number of uses for up to 300 s. Now it names its tool and carries a unique ID, and the app refuses a second use.

## Change

| File | Content |
|---|---|
| `templates/app/backend/src/standard/tools.ts` | Reads the `tool` and `jti` claims. A token must name the route's tool (`@list` for the list) and its `jti` must be new; `jti` values are kept in memory until expiry plus clock skew. `MAX_TOKEN_SECONDS` goes from 300 to 120. New option `requireBinding` rejects tokens without the claims |
| `scripts/test/backend-tools.test.mjs` | Replay, wrong tool, list token, malformed claims, the lenient and strict modes, and expiry of the seen set |
| `docs/ai-tools.md` | The two claims, the new lifetime, and the deploy order |

## What was decided

- **Both shapes are accepted first.** Apps already deployed get tokens without the claims until shared-ai is updated, so `requireBinding` is off by default and each app turns it on after the signer deploy.
- **No body hash.** The issue marks it optional; one-use plus the tool name already stops replay, and a hash would force both sides to agree on a JSON canonical form.
- **In-memory `jti` set.** One API process per app and a 120 s lifetime make a shared store unnecessary.

## Checks

- `node --test scripts/test/backend-tools.test.mjs`: 15 passed.
- The signer side is in sirloinbh/shared-ai (see the PR).
