# #570 knip: do not report zod as unused

## Change

| File | Content |
|---|---|
| `templates/app/knip.json` | `ignoreDependencies` adds `zod` |

## Why

`frontend/src/contract.ts` (a copy of `shared/contract.ts`) imports `zod`, and knip does not count an ignored file as a user of the package, so the frontend `zod` dependency was reported as unused and failed the strict knip step (health-log#178, life-journal#122). Every backend uses `zod` anyway.

## Verification

- `npm run check`: recorded in the PR body
