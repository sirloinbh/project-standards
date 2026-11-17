# #570 knip: skip the shared contract files

## Change

| File | Content |
|---|---|
| `templates/app/knip.json` | `ignore` adds `shared/contract.ts`, `backend/src/contract.ts`, `frontend/src/contract.ts` |

## Why

`contract:sync` copies `shared/contract.ts` to the backend and frontend. Files that no code imports yet (and the `ApiError` type) are reported as unused, which fails the strict knip step in 5 apps (found in life-journal#122). The files are a shared contract, kept identical on purpose.

## Verification

- `npm run check`: recorded in the PR body
