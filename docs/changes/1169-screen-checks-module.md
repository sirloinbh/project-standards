# #1169 Move the screen checks to design-system

Epic #1155. The text size (12px) and Korean screen text checks that every app runs through `.standards/check.mjs` are owned by `sirloinbh/design-system` (`delivery/standards/screen-checks.mjs`, design-system PR for #1169). The apps still run the same groups (`text size`, `screen text`) with the same messages.

## Change

| File | Content |
|---|---|
| `scripts/lib/screen-checks.mjs` | The checks moved out of `scripts/standards-check.mjs` (`checkMinFontSize`, `checkKoreanScreenText` and helpers), byte-identical to the design-system file. This copy is what sync delivers until the first release is pinned |
| `scripts/standards-check.mjs` | Imports and re-exports them, so the existing tests and `runCheck` are unchanged |
| `templates/index.json` | Vendored `.standards/lib/screen-checks.mjs` from `scripts/lib/screen-checks.mjs` |
| `scripts/lib/design-system.mjs`, `templates.mjs`, `sync-plan.mjs` | With a pinned release, the vendored file is read from the release's `delivery/standards/screen-checks.mjs`; a release without it fails the sync. The managed header and the file content stay identical |
| `scripts/test/design-system-delivery.test.mjs` | Release fixture holds the module; tests for release vs local source and for the missing file |
| `scripts/test/fixtures/sync-snapshot.json` | One new managed file for every target: `.standards/lib/screen-checks.mjs` (the code left `check.mjs`, so every repo that runs `check.mjs` needs it) |

## Not moved

- `scripts/lib/korean-text.mjs` and its use in the compliance report: it counts Korean documents in all repositories, so it is not a screen check.
- `scripts/test/ui-kit-english.test.mjs` stays until #1170 removes `templates/ui/`; design-system has the replacement `scripts/test/no-hangul.test.mjs`.

## Same results

The tests of both checks in `standards-check.test.mjs` pass unchanged against the moved module, and the planned files of an app are byte-identical with and without a release holding the same module.

## Checks

`UPDATE_SNAPSHOT=1 npm test`, `npm run check`: passed.
