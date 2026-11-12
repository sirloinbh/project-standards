# #70 Package publish workflow (tag to GitHub Packages)

## Change

| File | Content |
|---|---|
| `.github/workflows/publish.yml` | Pushing a tag `<package>/v<version>` runs these in order: central check (`npm run check`), tag and version match check (`package-guard --tag`), `npm publish --ignore-scripts`, and GitHub Release creation. The Release body contains the CHANGELOG, the commit SHA, and the publish run URL |
| `scripts/changelog-section.mjs` | Extracts only one version's content from the CHANGELOG. Used for the Release body and the sync PR body (#63) |
| `scripts/check-workflows.mjs` | Checks workflow files without external tools. It checks that every `uses:` is pinned to the commit SHA in `versions.json` with a version comment, and that a top-level `permissions` exists. Workflows in the template folders are included |
| `package.json` | Added `workflows:check` to `npm run check` |
| `scripts/test/workflows.test.mjs` | 4 tests |

## Rules decided

- Permissions are limited to what this workflow needs: `contents: write` (Release) and `packages: write` (publish).
- `concurrency` prevents publishing the same tag at the same time.
- Pushing the tag is done by the user (#88). Even after this workflow is merged, it does not run without a tag.
- The publish run URL in the Release body is the basis on which sync verifies the provenance of our own packages (ADR-0004).

## Checks

- `npm run check`: 96 tests passed, `package-guard: ok`, `check-workflows: ok`
- A real run will be verified when the first tag is pushed (#88). A workflow syntax checker such as actionlint is not installed, so I checked only Action pinning and permissions with the check script above.
