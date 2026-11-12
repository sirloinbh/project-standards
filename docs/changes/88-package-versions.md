# #88 Record shared packages 1.0.0 in versions.json

## Change

| File | Content |
|---|---|
| `versions.json` | Changed the 4 entries in `packages` (`@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `design-tokens`) from `null` to `"1.0.0"` |
| `scripts/test/fake-github.mjs` | Added `fakePublishedCentral()`, which imitates a central repo with the packages published. It returns a Release per tag and a successful publish.yml run |
| `scripts/test/sync-pr.test.mjs`, `scripts/test/labels.test.mjs` | The sync run tests now use `fakePublishedCentral()` as the central repo |
| `scripts/test/scaffold.test.mjs` | Before checking the scaffold output, it creates `node_modules/@sirloinbh/*/package.json` to stand in for the `npm ci` install |

## What was decided

- On 2026-10-24 the user pushed 4 tags, 4 publish.yml runs succeeded, and 4 Releases were created. The user added the 8 app repos with Read to the Actions access of each package.
- While the package versions were `null`, the sync package provenance check (`verifyPackages`) and the standards-check install check were skipped. Once the versions were filled in, these two steps really ran, and 3 tests that read the real `versions.json` failed. The implementation works as intended, so I adjusted the test fixtures to the "published and installed" state.
- Package versions apply to downstream repos from the first sync (#97). `maxRollout` is 0, so no PR is opened in any repo for now.

## Checks

- `npm run check` passed (398 of 400 tests passed, 2 skipped, registry-check, docs check, tokens check, package-guard, check-workflows)
