# Change the header comment of managed .ps1 files to ASCII (#213)

## Change

| File | Content |
|---|---|
| `scripts/lib/render.mjs` | `.ps1` files use an ASCII header comment (`HEADER_TEXT_ASCII`). `hasHeader` recognizes both formats so the header is not added twice |
| `scripts/test/render.test.mjs`, `scripts/test/scripts-templates.test.mjs`, `scripts/test/templates.test.mjs` | Fixed the expected values and added a check that every rendered `.ps1` is ASCII |
| `docs/design.md` | Added the `.ps1` exception to the header text rule |

## Why

- `verify` in the workout-memo sync PR (sirloinbh/workout-memo#143) failed the `backup.ps1 is ASCII only` test.
- The template body is ASCII, but the header comment that sync adds was Korean. Windows PowerShell 5.1 reads a `.ps1` without a BOM using the system ANSI code page, so Korean text can be garbled (workout-memo #55).
- Adding a BOM would also work, but the renderer compares LF text without a BOM and the templates are already ASCII, so changing only the header comment is the smaller change.

## Checks

- `npm run check`: passed.
- `npm test`: 408 of 411 tests passed, 3 skipped, 0 failed.
