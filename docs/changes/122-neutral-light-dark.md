# #122 Unify colors as black-and-white light and dark modes, and decide app display names

## Decision

We proposed 8 theme colors per app, but the user decided "just unify everything as white-black dark mode and white mode" (2026-10-22). This changes the original requirement 4-1 (distinguish apps by name and theme color), so we recorded it as [ADR-0008](../adr/0008-neutral-light-dark.md).

## Change

| File | Content |
|---|---|
| `docs/adr/0008-neutral-light-dark.md` | Black-and-white unification, light and dark modes, apps distinguished only by display name |
| `design/tokens.json` | Replaced the 6 per-app theme color slots with common fixed values. Added 30 dark colors and the mode rules (based on shadcn/ui neutral). The success and warning colors also have dark values |
| `scripts/build-tokens.mjs`, `packages/design-tokens/*.css` | Dark colors apply in two cases: the `.dark` class, or `prefers-color-scheme: dark` when there is no `.light`. Set `color-scheme`, and defined the Tailwind `dark:` variant with the same condition |
| `scripts/gen-docs.mjs`, `docs/design-tokens.md` | Two columns, light and dark, in the color table |
| `registry/projects.json` and schema, `scripts/lib/registry.mjs`, `docs/projects.md` | `displayName`. A duplicate makes registry-check fail. workout-memo uses its current "FORM · 나의 운동 기록" ("FORM · my workout log"), and the others are the same as `title` |
| `docs/design-system.md`, design tokens README and CHANGELOG | Removed the theme color description and added the light and dark mode rules |
| `scripts/test/*` | Tests for the shadcn color names in both modes, contrast, duplicate display names, and the generated CSS |

Added a task for the mode switch UI to issue #124 (common layout): system default, saved choice, and no flash on the first paint.

## Verification

- `npm run check`: 119 tests passed, 4 generated files up to date, `package-guard: ok`, `check-workflows: ok (8 files)`
- **Contrast (WCAG, both modes):** Default text on background, card, and LNB are 7:1 or higher (AAA). Secondary text, primary button text, and secondary button text are 4.5:1 or higher (AA).
- **Tailwind compile:** Compiled and checked with Tailwind 4.3.3, which is installed in workout-memo (no new install).
  - `dark:bg-card` is generated for both the `.dark` class condition and the system dark mode (`:root:not(.light)`) condition.
  - The `.dark` block sets the dark background color.
  - The existing 8 checks still pass.
