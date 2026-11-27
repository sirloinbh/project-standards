# #1135 The 12px text check fails

The check from #1127 warned so that it would not turn every app red at once. A scan of all eight app mains on 2026-11-27 found no text under 12px (the last offenders were fixed in plan-routine#334 and cert-manager#223), so it is now a failure.

| File | Change |
|---|---|
| `scripts/standards-check.mjs` | `checkMinFontSize` findings are problems (group `text size`), not warnings |
| `scripts/gen-docs.mjs`, `docs/design-tokens.md` | The 12px floor paragraph says the check fails |
| `scripts/test/standards-check.test.mjs` | The repo fixture with `text-[10px]` now fails the check |

Checked with `npm run check`.
