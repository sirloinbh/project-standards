# #1127 Keep all screen text at 12px or larger and check it

User requirement (2026-11-26): text that is too small is hard to read.

## Change

| File | Change |
|---|---|
| `scripts/standards-check.mjs` | `checkMinFontSize`: finds `text-[Npx]`, `text-[Nrem]`, CSS `font-size`, and `fontSize` (inline style or SVG attribute) under 12px in `frontend/src` `.ts`, `.tsx`, `.css` files (not tests). One message with the count and the first five places |
| `scripts/test/standards-check.test.mjs` | Test: 12px and larger passes; 10px class, SVG `fontSize`, inline style and CSS are reported |
| `templates/app/skills/std-ux-audit/SKILL.md` | "No text under 12px (meta included, SVG labels too); body text at least 13px" |
| `scripts/gen-docs.mjs`, `docs/design-tokens.md` (generated) | States the 12px floor |

## Decision: warning first

The rule is a **warning**, not a problem. Apps may already have smaller text (study-log#411 found 10px heatmap labels), and a problem would turn those apps red when the sync PR arrives. Each sync PR now lists the offenders in the check output; apps fix them, then a follow-up changes it to a problem.
