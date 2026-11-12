# #126 Turn on common UI for workout-memo

workout-memo switched its screens to the common design system (workout-memo#159, PR workout-memo#160). We turn on `features.ui` for workout-memo in the registry so the common components and layout become sync targets.

## Change

| File | Content |
|---|---|
| `registry/projects.json` | workout-memo `features.ui`: `false` → `true` |
| `scripts/test/fixtures/sync-snapshot.json` | Added 36 `templates/ui/` files to what workout-memo receives (`UPDATE_SNAPSHOT=1`) |
| `docs/ui-components.md` | The apps that now have `features.ui` on |
| `docs/design-system.md` | The order decided in workout-memo for "Switching an existing app" (add the common files, existing CSS layers and `.legacy` scoping, contrast, modals, browser tests) |

## Decisions

- First put the same common files as the sync preview into the app PR (workout-memo#160), and merge this PR after that PR is merged. Then the workout-memo sync PR only has the manifest update.
- Putting `@sirloinbh/design-tokens` back into the app profile `packages` and the `frontend/package.json` fields waits until all 8 apps have installed it (the standards check would fail in apps that have not).

## Verification

- `npm run check`: passed (413 of 414 tests passed, 1 skipped, 0 failed)
- `node scripts/sync.mjs --dry-run --target sirloinbh/workout-memo --local workout-memo=<PR branch>`: the common files match the PR branch, and the only change is `.standards/manifest.json`
