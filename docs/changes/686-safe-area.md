# #686 Fix safe-area offsets in Sheet and the app shell

## Change

| File | Content |
|---|---|
| `components/ui/sheet.tsx` | The built-in close button is offset by `env(safe-area-inset-top)` only for `left`, `right` and `top` sheets; a `bottom` sheet uses `top-3` so the button no longer lands in the content |
| `components/layout/app-shell.tsx` | The header adds the top inset to its 3.5rem, so the md+ sidebar's `top` and `height`, and the content's `min-height`, now add it too (they used a bare `3.5rem`, so the sidebar slid under the header and overflowed on devices with an inset) |
| `sheet.test.tsx`, `app-shell.test.tsx` | Assert the classes per side and for the sidebar and content height |

## Verification

- The Sheet and app-shell Vitest cases pass in a scratch copy (Vitest 5.0.3, jsdom) using an app repo's installed packages; the central check does not run Vitest.
- **Not done: the browser check at 390x844 and 1440x900 with an emulated inset.** There is no running app in this repository to open with an emulated safe area, and the sizes follow from the arithmetic (header height = inset + 3.5rem; sidebar top and height use the same sum). Check it in the first app that takes the sync (the agent reviewing that sync PR can use the devtools safe-area override) and record the result on #686.
