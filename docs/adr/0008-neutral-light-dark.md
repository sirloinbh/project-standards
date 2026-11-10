# 0008. Unify on black-and-white light and dark modes with no per-app theme color

- Status: Accepted (issue #122)
- Date: 2026-10-22
- Changes a decision: the theme color part of original requirement 4-1 ("distinguish only by website name and theme color, with no duplicates")

## Context

- At first, the 8 apps were to share the same layout and components and be distinguished only by name and theme color. So the design tokens got 6 slots for per-app theme colors (#121).
- 8 colors spaced 45° apart on the color wheel were proposed, but the user decided "just unify everything on white-and-black dark mode and light mode" (2026-10-22).

## Decision

- All 8 apps use the same black-and-white (shadcn/ui neutral) colors. There is no per-app theme color. Apps are distinguished only by **display name** (registry `displayName`).
- Both light and dark modes are supported.
  - By default, the system setting (`prefers-color-scheme`) is followed.
  - When the user chooses, that choice is saved and a `light` or `dark` class is added to `<html>`.
  - With no class, the system setting is followed. So the right colors appear even before the script runs.
- Tailwind's `dark:` variant follows the same condition. There are two cases: the `.dark` class is present, or the system is in dark mode while `.light` is absent.
- The mode switch UI (toggle) and prevention of the first-paint flash are built in the common layout (#124).

## Consequences

- The token colors are 30 for light and 30 for dark, the same for all apps. No colors are overridden in app CSS.
- Per-app color values and the color-difference check are removed from the registry. A display name duplicate check is added instead.
- Apps cannot have their own brand feel. If it becomes necessary later, decide again with a new ADR that changes this one.
