# #357 Fix cn() mistaking text size tokens for colors

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/lib/utils.ts`, `scaffold/app/frontend/src/lib/utils.ts` | Changed `cn()` to `extendTailwindMerge` and registered the 4 text style tokens in the font-size group |
| `templates/ui/frontend/src/lib/utils.test.ts`, `templates/app/.prettierignore.tmpl` | Behavior test that runs in the app, and the managed file list |
| `scripts/test/cn-text-styles.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | Token list match check, synced file list |

## Decisions

- The token names live in one place in `utils.ts`, and the central test compares them with `@utility text-*` in `packages/design-tokens/tailwind.css`. If tokens are added, this test fails.
- Apps need no new package. `tailwind-merge` is already a shared dependency.

## Checks

- The central repo does not have `tailwind-merge`, so I ran the real `utils.ts` with version 3.7.0 in cert-manager's `node_modules` and checked the result.
- `text-body-sm` also sets a color, but Tailwind puts utilities with fewer declarations later, so I judged that the color of `text-destructive` is applied. The screen check is done after the sync.

## Impact

- Text in shared components that were given a text color returns to its original size. Screens may change, so check the visual comparison result of the app CI on the sync PR.
