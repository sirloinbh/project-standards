# #363 Make the offline screen of dark-only apps dark

## Change

| File | Content |
|---|---|
| `templates/app/frontend/public/offline.html.tmpl` | Renamed from `offline.html`, and replaced the color-related lines with variables |
| `scripts/lib/vars.mjs` | Added `theme.offlineMeta` and `theme.offlineStyle` |
| `scripts/test/dark-only.test.mjs` | Added a per-app rendered result check |
| `docs/pwa.md` | Updated the offline screen description |

## Decisions

- The renderer has no conditionals, and adding conditionals is not worth it because only this file uses them, so the two kinds of color lines are kept in `vars.mjs`.
- A `darkOnly` app renders only `color-scheme: dark`, the dark colors, and a single `theme-color` `#0a0a0a`.

## Checks

- Compared the rendered results before and after the change for all 8 apps. The 7 apps with `darkOnly` off do not differ by a single character, and only workout-memo changed.
- In the `.standards/manifest.json` of the 8 apps, the source path of this file changes to `offline.html.tmpl`.
