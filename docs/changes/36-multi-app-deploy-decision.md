# #36 Decide the structure for deploying several apps to one Lightsail (research and decision part)

## Decision (2026-10-23, user, recommended option as is)

The comparison is in a comment on #36, and the decision is in [ADR-0009](../adr/0009-multi-app-single-lightsail.md). Each app has its own compose and postgres container, the per-app web port (8101–8108) is open only to allowed IPs, builds happen on the server with a server-wide deploy lock, each app has its own autodeploy timer, and the server is 2 GB from the second app.

## Change

| File | Content |
|---|---|
| `docs/adr/0009-multi-app-single-lightsail.md` | New ADR |
| `docs/costs.md` | Aligned the assumptions with ADR-0009: shared postgres to per-app containers, ECR cost removed (server builds). Recalculated totals (2 GB $13.50 to $13.00, 4 GB $25.50 to $25.00) and the per-app allocation table. ECR moved to the "other configurations" table |

## Remaining work

- The `templates/app/deploy/` templates, the rendering tests, and `bash -n` come after #94 (removing `infrastructure/` from workout-memo).

## Checks

- Recalculation: 2 GB $12 + snapshot $1 = $13.00, $1.625 per app (2,502.5 won after tax, rounded to 2,503 won). 4 GB $24 + $1 = $25.00, $3.125 per app (4,812.5 won, rounded to 4,813 won).
- `npm run check` passed (all 392 tests passed).
