# #328 Apply shared ESLint config 1.1.0 to the apps (convention rules only)

## Change

| File | Content |
|---|---|
| `versions.json` | `packages.@sirloinbh/eslint-config` 1.0.0 to 1.1.0 |
| `docs/versions.md` | Regenerated |
| `scripts/test/templates.test.mjs` | Reads the expected version from `versions.json` |

## Decisions

- On 2026-10-28 the user pushed the tag `eslint-config/v1.1.0` and released 1.1.0 (`publish` succeeded, Release created).
- The app template `eslint.config.mjs` was not changed. It does not pass `tsconfigRootDir` or plugins, so the only rules newly turned on in the apps are type-only writing and no default exports. The 8 apps have 0 violations (#308).

## What the user does in the sync PRs

The sync PR changes only `@sirloinbh/eslint-config` in the app root `package.json` to 1.1.0 and leaves the lockfile as it is. So the CI of that PR fails at `npm ci`. In each app, run the following on that PR branch to match the lockfile.

```
npm install --ignore-scripts
npm run lockfiles:sync
```

`@sirloinbh/*` is our own package, so it is verified by checking the origin instead of the 14-day rule (ADR-0004). No new external packages come in (1.1.0 also has 0 dependencies).

## Checks

- `npm run check`: 490 of 491 tests passed, 1 skipped, 0 failed
- `npm run sync:preview`: `@sirloinbh/eslint-config` in the app manifest is 1.1.0
