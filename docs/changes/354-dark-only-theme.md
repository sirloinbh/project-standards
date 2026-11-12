# #354 Per-app dark-mode-only option (registry darkOnly)

- Issue: [#354](https://github.com/sirloinbh/project-standards/issues/354)
- Branch: `feat/354-dark-only-theme` (started from main `83b6d06`)
- Status: code, tests, and docs are done. Work after merge is done in workout-memo#184.

## Background (2026-10-30)

- The workout-memo user decided the UI standard (workout-memo#98).
  - Use dark mode only. Remove the light and system choices.
  - Use the shared dark tokens as they are (background `#0a0a0a`, card `#171717`). Tokens are not changed.
  - Introducing new npm packages was allowed, but shadcn/ui and `radix-ui` are already installed, so there is nothing to add.
- The files that decide the screen mode (`theme-init.js`, `theme.ts`, `AppShell`, `ThemeToggle`) are all centrally managed files. So it is made a per-app option centrally, not in the app.
- Instead of the "just default to dark in the app" approach, the user chose to put a per-app fixed option in the central repo.

## Change (so far)

| File | Content |
|---|---|
| `registry/projects.schema.json`, `registry/projects.json` | Added `features.darkOnly` (boolean, required). Only workout-memo is `true`, and the other 7 apps are `false` |
| `scripts/lib/vars.mjs` | Added the template variable `theme.color`. `#0a0a0a` if `darkOnly`, otherwise `#ffffff` |
| `templates/app/frontend/public/manifest.webmanifest.tmpl` | `background_color` and `theme_color` use `{{theme.color}}` |
| `templates/ui/frontend/public/theme-init.js` to `theme-init.js.tmpl` | If `darkOnly`, it adds `dark` to `<html>` regardless of the stored value and finishes |
| `templates/ui/frontend/src/lib/theme-config.ts.tmpl` (new) | The `DARK_ONLY` value that app code reads |
| `templates/ui/frontend/src/lib/theme.ts` | If `DARK_ONLY`, `readTheme()` is always `dark` |
| `templates/ui/frontend/src/components/layout/app-shell.tsx` | If `DARK_ONLY`, it does not draw the screen mode menu (`ThemeToggle`) |
| `templates/ui/.../app-shell.test.tsx`, `lib/theme.test.ts` | Changed the existing mode switch tests to `skipIf(DARK_ONLY)`. For dark-only apps, the "no menu" and "always dark" tests run (`runIf`) |
| `templates/app/.prettierignore.tmpl` | Added the new centrally managed file `frontend/src/lib/theme-config.ts` |
| `scripts/test/dark-only.test.mjs` (new), `scripts/test/scaffold.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | Per-app rendered value check, scaffold fixed value, snapshot of the downstream repo file list |

## Verification (2026-10-30)

- `node --test scripts/test/dark-only.test.mjs`: 3 pass
- `UPDATE_SNAPSHOT=1 npm test`: at first 1 fail, because the new file was not in the `.prettierignore` template. It passed after adding it.
- `npm run check`: 506 tests, 505 pass, 0 fail
- The screen tests inside the templates (`*.test.tsx`, `theme.test.ts`) do not run centrally. They must be checked in the CI of apps that receive the sync PR (not done yet).

## Docs and preview (2026-10-31)

- Added `docs/adr/0011-dark-only-option.md`. Wrote `darkOnly` in `docs/design-system.md`, `docs/layout.md`, and `docs/pwa.md`.
- Checked the `npm run sync:preview` result directly.
  - workout-memo: `darkOnly = true` in `theme-init.js`, `DARK_ONLY = true`, manifest color `#0a0a0a`.
  - study-log: `darkOnly = false`, `DARK_ONLY = false`, manifest color `#ffffff`.
  - The other 5 apps also have `DARK_ONLY = false`. `shared-aws-infrastructure` does not have this file.
- The user allowed the merge and the sync PRs for the 7 apps (2026-10-31).

## To do next
### In this PR (central)

- [x] Write ADR-0011 "per-app dark fixed option". State that it changes the "all apps support both modes" part of ADR-0008 (unified black-and-white light and dark), and why.
- [x] Fix `docs/design-system.md`.
  - "The only thing that differs per app is the display name" in the first paragraph
  - `darkOnly` in the "Light and dark mode" section
- [x] Fix `docs/layout.md` (`theme-init.js` description) and `docs/pwa.md` (manifest color is `#0a0a0a` when `darkOnly`).
- [x] Check the result files of workout-memo and one other app directly with `npm run sync:preview`.
- [x] When the docs are done, run `npm run check` again, take the PR out of draft, and merge (the agent merges the central repo).

### After merge (workout-memo, [#184](https://github.com/sirloinbh/workout-memo/issues/184))

- [ ] Check the sync PR (`chore/standards-sync-*`). By this repo's rule, the user merges sync PRs.
- [ ] Expect CI `e2e-visual` to fail on the sync PR, because every screen changes to dark.
  - Update the 44 visual baselines through the `visual-baselines` artifact and check the before and after screens.
  - Fix the axe contrast violations that appear in dark. Remove light-only allowed entries from `e2e/a11y-known-contrast.json`.
  - Fix the rules in `style.css` that assume a white background.
  - Add the commits above to that sync PR. Until then, do not merge into central main (the #114 rule).
- [ ] Change the `theme-color` meta in workout-memo `frontend/index.html` to a single dark value (`#0a0a0a`) (an app-managed file).
- [ ] Write "dark only" and the reason in workout-memo `docs/design-system.md`.

### User steps

- [x] Close workout-memo#98. It was closed by merging workout-memo PR #185 (2026-10-31).
- [ ] Check the workout-memo production deploy (#123 merge commit `2239199`): run `cat /opt/workout-memo/.deployed` on the server. The agent's SSH access was blocked by the permission policy.

## Limits

- A `darkOnly` app can follow the system setting color only for a very short moment before `theme-init.js` runs. The script runs synchronously at the very top of `<head>`, so no visible flicker is expected in practice. But this has not been checked yet.
