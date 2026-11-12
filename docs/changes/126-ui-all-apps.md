# #126 Turn on common UI sync for all 8 apps

After workout-memo (#160), the other 7 apps switched their screens to the common design system (study-log#111, health-log#13, life-journal#11, money-ledger#11, english-study#11, plan-routine#28, dev-career-portfolio#11). All 8 apps now have `@sirloinbh/design-tokens` installed.

## Change

| File | Content |
|---|---|
| `registry/projects.json` | `features.ui` and `features.vitest` → `true` for the 7 apps |
| `sync.config.json` | Put `@sirloinbh/design-tokens` back into the app profile `packages` (it was removed in #211) |
| `templates/index.json` | `dependencies.@sirloinbh/design-tokens` in the `frontend/package.json` fields |
| `scripts/test/fixtures/sync-snapshot.json` | Added 37 common UI and `vitest.config.ts` files to each of the 7 apps (259 files) |
| `scripts/test/*.test.mjs` | Tests that used study-log as the "app with the feature off" example now use a copy with the feature turned off, and the expected values for the 4 shared packages and the frontend fields are updated |
| `docs/ui-components.md`, `docs/design-system.md` | All 8 apps are on, and how to switch from fake React tests |

## Decisions

- First put the same common files as the sync preview into the 7 app PRs and merge them, then merge this PR. After that, the sync PRs of the 8 apps only contain the manifest update (since #234, a PR is also opened when only the manifest changes).
- `@sirloinbh/design-tokens` is used by the apps as runtime CSS, so it is managed as a `dependencies` field, not `devDependencies` (same as the scaffold).

## Verification

- `npm run check`: passed (414 of 415 tests passed, 1 skipped, 0 failed)
- Sync preview with the merged branches of the 7 apps passed in with `--local`: the common files and fields are all the same, and the only change is `.standards/manifest.json`
