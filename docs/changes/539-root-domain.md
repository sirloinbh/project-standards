# #539 Fill the registry root domain

## Change

| File | Content |
|---|---|
| `registry/platform.json` | `rootDomain` = `daysofme.com` (registered by the user in Route 53 on 2026-11-14, #249) |
| `docs/projects.md` | Regenerated: the 8 apps' addresses are `<name>.daysofme.com` |
| `docs/costs.md` | Domain section: bought, paid AWS plan needed for Route 53 registration, about $0.23 per app per month |
| `scripts/test/gen-docs.test.mjs`, `scripts/test/proxy.test.mjs` | Expect the real root domain; the refusal test now sets `null` itself |

## Decisions

- Name chosen by the user: `daysofme.com` ("days of me", a record of life that reads as the user's own for anyone).
- The domain price stays the research value until the first bill shows the real amount.

## Verification

- `node scripts/proxy-config.mjs` writes `server_name workout-memo.daysofme.com` and the other 7 apps
- `npm run check`: recorded in the PR body
