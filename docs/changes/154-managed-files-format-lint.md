# #154 Sync-managed files get caught by the apps' format and lint checks

## Finding

We checked the #85 scaffold output with Prettier 3.9.10 and ESLint 10.12.0, which are installed in workout-memo (by linking `node_modules` without installing).

- `prettier --check .`: 24 managed files were flagged. The central scripts (`.standards/*`) were written with the central line length, and the tables in the docs were not aligned.
- `npm run format` rewrites managed files and makes the hash check fail.
- `eslint .`: the regexes in `.standards/lib/hash.mjs` and `render.mjs` contain a raw BOM character, which triggers `no-irregular-whitespace`.

This is a problem that would have made `npm run check` fail in all 8 apps right after the first sync (#97).

## Change

| File | Content |
|---|---|
| `templates/app/.prettierignore` | Added, in the central section, all managed files that Prettier handles |
| `templates/app/eslint.config.mjs` | Excludes `.standards/**`. The central repo checks the central scripts |
| `scripts/lib/hash.mjs`, `render.mjs` | Wrote the BOM character as a `﻿` escape |
| `scripts/test/templates.test.mjs` | Checks that every managed file with an extension Prettier handles is covered by `.prettierignore`, and that the ESLint exclusion exists |

## Verification

- `npm run check` passed (143 tests).
- In the scaffold output, managed files no longer show up in `prettier --check` or `eslint .`.
