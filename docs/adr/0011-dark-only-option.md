# 0011. Add an option to lock dark mode per app

- Status: Accepted (issue #354)
- Date: 2026-10-31
- Changes a decision: "all apps support both light and dark modes" in [ADR-0008](0008-neutral-light-dark.md)

## Context

- The workout-memo user decided to use only dark mode (workout-memo#98, 2026-10-30).
- The files that decide the screen mode (`theme-init.js`, `theme.ts`, `AppShell`, `ThemeToggle`) are all centrally managed files, so an app cannot edit them.
- If an app only adds the `dark` class in `index.html`, the menu can still switch to light, so it does not become "dark only".

## Decision

- Add `features.darkOnly` (boolean, required) to the registry. Now only workout-memo is `true` and the other 7 apps are `false`.
- A `darkOnly` app behaves as follows.
  - `theme-init.js` adds the `dark` class to `<html>` regardless of the saved value.
  - `readTheme()` always returns `dark`.
  - `AppShell` does not render the screen mode menu.
  - The PWA manifest's `background_color` and `theme_color` are `#0a0a0a`.
- Colors use the common dark tokens as is. The tokens are not changed.
- App code reads the value through `DARK_ONLY` in the new centrally managed file `frontend/src/lib/theme-config.ts`.

## Consequences

- The rest of ADR-0008 stays as is. The 8 apps use the same black-and-white tokens, and there is no per-app theme color.
- What can differ per app is the display name and this option.
- For an app with `darkOnly` turned on, every screen changes in the sync PR. The visual baseline update and dark contrast fixes must be done in that same PR.
- All apps receive `theme-config.ts` and the `theme-init.js` built from the template. The behavior of apps with `false` stays the same.
