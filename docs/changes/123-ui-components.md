# #123 Basic UI component set (shadcn/ui, skeleton, loading spinner)

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/` | Button, Input, Label, Checkbox, Select, Card, Badge, Sonner (toast), Skeleton (text, card, list), Spinner (3 sizes), EmptyState, and 10 per-component test files |
| `templates/ui/frontend/src/lib/utils.ts` | `cn()` |
| `registry/projects.schema.json`, `projects.json` | Added `features.ui`. `false` for all 8 apps |
| `sync.config.json` (+ schema), `scripts/lib/sync-plan.mjs` | `featureTemplates`: add a template folder only for projects that have the feature on |
| `templates/app/.prettierignore` | The components folder and `lib/utils.ts` (#154 rule) |
| `scaffold/app/frontend` | Dependencies `radix-ui`, `sonner`, `tw-animate-css`, and `tw-animate-css` in `index.css` |
| `docs/ui-components.md`, `docs/ui-components/*.png` | The list, the order for turning it on in an app, and the check results with screenshots |
| `docs/dependency-policy.md` | Rows for radix-ui, sonner, vaul, tw-animate-css |

## Decisions

- **Roll out with a feature flag.** If we synced the components to all 8 apps right away, type checks and builds would break in apps without radix-ui. So we sync only to apps with `features.ui` on, and turn it on per app in #126 while installing the dependencies.
- We copied the official shadcn/ui source (Tailwind 4, the unified `radix-ui` package) by hand (no `npx shadcn`). What we changed: relative paths instead of a path alias, 44px on touch devices (`pointer-coarse:`), the central text utilities (`text-body-sm`, `text-caption`), Korean accessible names, `success` and `warning` badges, and a darker destructive background in dark mode (contrast 2.89 → 6 or more).
- Tests use only `@testing-library/react`, so they also run in apps without `user-event`.

## Verification

- Central `npm run check` passed (157 tests). Added a check that the components enter the plan only when the feature is on.
- With the user's approval (2026-10-22), installed `radix-ui@1.7.0 sonner@2.0.8 vaul@1.1.2 tw-animate-css@1.4.0` with `--ignore-scripts` in a temporary working folder (confirmed no install scripts, no suspicious items from `ioc-scan`). Not installed in the repo.
- Results are in "Check results" in [ui-components.md](../ui-components.md): 23 tests, tsc, ESLint, contrast, touch size, keyboard, horizontal overflow.
