# Remove design-tokens from the app sync manifest (#211)

## Change

| File | Content |
|---|---|
| `sync.config.json` | Removed `@sirloinbh/design-tokens` from the app profile `packages` |
| `scripts/test/sync.test.mjs` | The expected manifest `packages` now has 3 entries |

## Why

- `verify` in the workout-memo sync PR (sirloinbh/workout-memo#143) failed the central standards check with `@sirloinbh/design-tokens — 설치되어 있지 않습니다(기대 버전 1.0.0)` (not installed; expected version 1.0.0).
- In #202 (#97), `design-tokens` was not added to the app `package.json` and was left to #126. But it stayed in the profile `packages`, so the manifest required it to be installed. `standards-check` passes only if every package in the manifest is in `node_modules`.
- The profile `packages` now means "packages the app installs". `design-tokens` will be added back in #126 together with the `frontend/package.json` field. Package publishing (`versions.json`) is unchanged.

## Checks

- `npm run check`: the result is written in the PR below.
