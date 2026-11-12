# #124 Common layout and navigation

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/` | Dialog, Sheet, Drawer (vaul), DropdownMenu, and tests |
| `templates/ui/frontend/src/components/layout/` | `AppShell` (top bar, LNB, mobile Sheet menu, footer, skip-to-content link, safe areas), `ThemeToggle`, tests |
| `templates/ui/frontend/src/lib/theme.ts`, `public/theme-init.js` | Saving the light, dark, or system choice, and applying it before the first paint |
| `templates/app/.prettierignore` | New managed files |
| `scaffold/app/frontend` | Uses `AppShell` and `Toaster`, `theme-init.js`, `vaul`, and `matchMedia` in the test setup |
| `docs/layout.md`, `docs/ui-components/layout-*.png` | Structure, responsive rules, decisions and reasons, how to apply, and check results |

## Decisions

- A short `AppShell` instead of the shadcn/ui Sidebar. We do not use NavigationMenu or a mobile bottom tab bar (reasons are in `docs/layout.md`).
- Set the vaul Drawer `autoFocus` default to `true`. A Chrome keyboard check found that Tab could leave an open drawer.

## Verification

- Central `npm run check` passed.
- Virtual slot 99 app: 37 tests, tsc, ESLint, vite build. 12 Chrome keyboard checks, 0px horizontal overflow (360, 768, 1280), contrast at least 4.74:1 in light and 6.94:1 in dark.
