# #97 Add a shared package devDependencies field to the app package.json

The to-do of the first workout-memo sync (#97), "add a field that manages `@sirloinbh/*` devDependencies with the `versions.json` package versions" (passed on from #65), was done separately before raising `maxRollout`.

## Change

| File | Content |
|---|---|
| `templates/index.json` | Added `devDependencies` to the app profile `fields`. The root `package.json` gets `@sirloinbh/eslint-config` and `@sirloinbh/prettier-config`, and `frontend/` and `backend/package.json` get `@sirloinbh/tsconfig` |
| `scripts/lib/render.mjs` | Allows `@` and `/` in template variable names, so a version is looked up by package name, as in `{{versions.packages.@sirloinbh/tsconfig}}` |
| `scripts/test/sync.test.mjs`, `scripts/test/render.test.mjs` | The devDependencies location and version per package, whether the plan stops for an unpublished (`null`) package, and the package name variable |
| `scripts/test/standards-check.test.mjs`, `scripts/test/templates.test.mjs` | Put the new managed field into the `package.json` of the example repo that follows the standard |

## What was decided

- **Only in the `package.json` files that use the packages.** This follows where the templates actually refer to them: `eslint.config.mjs` and `.prettierrc.json` use the root, and the `extends` in `tsconfig.json` uses `frontend/` and `backend/`. `frontend/` and `backend/` are installed with `npm ci` in each folder in the Docker build (design.md D3), so adding them only to the root would make the build fail.
- **`@sirloinbh/design-tokens` is not added.** No template uses it now. It is added in #126, which applies the design system to apps. The manifest `packages` still records all 4, as now.
- **Versions are exact, without `^`** (the value in `versions.json` as is). When a version is raised, the sync PR changes the three files together.
- If a package version is `null` (unpublished), rendering fails with "undefined template variable". Instead of using an empty value, sync stops.
- Sync does not change the `package-lock.json` of downstream repos. Updating the lockfile after receiving the sync PR is a user step (#98, #114).

## Checks

- `node --test scripts/test/sync.test.mjs scripts/test/render.test.mjs`: 21 passed.
- `npm run check`: 401 of 403 tests passed, 2 skipped (the same Windows conditions as before).
- The list of files downstream repos receive does not change, so the snapshot is unchanged (only fields change).
