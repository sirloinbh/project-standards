# #813 Do not export HEALTH_RETRY_MS from the managed health.ts

## Change

- `templates/ui/frontend/src/health.ts`: `HEALTH_RETRY_MS` is a module constant, not an export. It is used only inside the file (as the default of `useHealth`).

## Reason

In apps with `knipStrict` the unused export fails `npm run knip`, so `verify` failed in the #698 sync PRs. Same cause as #809.

## Verification

- `grep -rn HEALTH_RETRY_MS templates scaffold`: only `health.ts`. `npm run check`: see the PR.
