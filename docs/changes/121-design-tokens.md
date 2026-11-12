# #121 Decide all design tokens

## Change

| File | Content |
|---|---|
| `design/tokens.json` | Source of the design tokens: fonts, font size and weight, text styles, spacing, radius, shadow and border, responsive breakpoints, icon sizes, z-index, motion, loading display, and color. Includes a mapping table to the existing workout-memo tokens |
| `docs/design-tokens.md` | Table generated automatically from the file above |
| `scripts/gen-docs.mjs` | Added generation of `docs/design-tokens.md`. `--check` verifies both generated docs |
| `scripts/test/tokens.test.mjs` | 6 token consistency tests |

## Values and reasons

| Item | Value | Reason |
|---|---|---|
| Font | Pretendard Variable 1.3.9, self-hosted | User's choice. Served in a package with no external CDN, so it also works offline and in the PWA (#125) |
| Font size | Tailwind default steps xs–3xl | Same steps as the shadcn/ui components |
| Body line height | 1.6 | Readability of Korean body text |
| Headings | h1–h4 with two sizes (mobile, desktop), h1 700, h2–h4 600 | Mobile-first responsive design |
| Secondary and note text | `caption` (14px, muted-foreground), `meta` (12px) | User request: unify the note text style |
| Spacing | 4px unit, page margins 16, 24, 32px | Tailwind spacing scale |
| Radius | Base 10px, with 6, 8, 10, 14px | shadcn/ui default `--radius` |
| Responsive | Mobile first, minimum 360px, the LNB turns into a sidebar at `md` (768px), touch target 44px | User request: mobile optimization is required |
| Loading | shadcn Skeleton and the lucide `Loader2Icon` spinner, not shown if done within 300ms | User request: unify skeletons and spinners |
| Color | shadcn/ui neutral, plus success and warning. The only per-app difference is the 6 theme colors | User request: distinguish apps only by name and theme color |
| Dark mode | Not decided yet | Outside the request. Add it to the token file when introduced |

## Verification

- `npm run check`: 85 tests passed, `registry-check: ok`, both generated docs up to date
- Pretendard license: read the LICENSE text through the GitHub API and confirmed it is in SIL Open Font License form (with a Reserved Font Name notice). GitHub's automatic detection said `NOASSERTION`.
- Added to the tasks of #65: "Generate the token CSS from `design/tokens.json`, and include the Pretendard 1.3.9 woff2 and the OFL notice".
