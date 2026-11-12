# #41 Move the cost document to the central repo and allocate per app

## Change

| File | Content |
|---|---|
| `docs/costs.md` | Moved the monthly shared server cost (2 GB $13.50, 4 GB $25.50) and its basis from workout-memo `docs/shared-hosting-costs.md`. Added the per-app allocation rule (server and snapshot split equally by the number of apps in operation, ECR proportional to storage and split equally before measurement), the allocation table for the 8 apps, and the per-app amount by number of apps in operation. Account IDs, resource identifiers, and secrets are not included |

## What was decided

- The allocation is for management, not for splitting the bill. Per-app memory usage is not measured yet, so equal split is the default.
- Apps that are not deployed yet get no allocation. If only workout-memo is in operation, the whole server cost is workout-memo's share.
- Amounts use the price check date of the original document (2026-10-15) as is. I did not look them up again.

## Downstream repo

- I registered a link replacement issue in workout-memo (sirloinbh/workout-memo#139). The standard labels do not exist in that repo, so I registered it without labels (label sync is #40).

## Checks

- Only documents changed. `npm run check` passed (165 of 166 tests passed, 1 skipped, registry-check, docs check, tokens check, package-guard, check-workflows).
