# #1165 Pin @sirloinbh/design-tokens 1.1.1 (released from design-system)

- Issue: [#1165](https://github.com/sirloinbh/project-standards/issues/1165)
- Branch: `chore/1165-pin-design-tokens-1-1-1`
- Related: sirloinbh/design-system#3 (the move), #1170 (removes the copy here)

## Changes — 2026-11-28

- `versions.json` raises `@sirloinbh/design-tokens` from 1.1.0 to 1.1.1, and the generated `docs/versions.md` follows. 1.1.1 was published from design-system (tag `design-tokens/v1.1.1`, publish run 46082535289). Its values, fonts and exports equal 1.1.0, so the apps' files do not change; only the package version in their `package.json` and lockfile.
- `packages/design-tokens` here gets version 1.1.1 and a CHANGELOG entry. The scaffold check compares the pinned version with the version in this folder, so the two must agree until #1170 deletes the folder.

## Verification

- `npm run check` passes (756 tests, 0 failed).
