# #809 Do not export DEFAULT_TIMEOUT_MS from the managed api.ts

## Change

- `templates/ui/frontend/src/lib/api.ts`: `DEFAULT_TIMEOUT_MS` is a module constant, not an export. It is used only inside the file.

## Reason

In apps with `knipStrict` the unused export fails `npm run knip`, so `verify` failed in the #698 sync PRs.

## Verification

- `grep -rn DEFAULT_TIMEOUT_MS templates scaffold`: only `api.ts`. `npm run check`: see the PR.
