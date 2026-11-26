# #985 @sirloinbh/eslint-config 1.2.0 (peers eslint 10.15.0, typescript-eslint 8.73.0)

Part 1 of 2. This PR changes only `packages/eslint-config`. After the user pushes the tag `eslint-config/v1.2.0`, a second PR raises `versions.json` (`eslint`, `typescript-eslint`, `@sirloinbh/eslint-config`) and the files that follow it.

## Change

- `packages/eslint-config/package.json`: version 1.2.0; peers `eslint` 10.15.0 and `typescript-eslint` 8.73.0 (exact pins, as before). No rule changes.
- `CHANGELOG.md`: 1.2.0 entry.

## Why

eslint 10.15.0 needs `minimatch ^11.0.5`; typescript-estree 8.73.0 needs `minimatch ^11.0.1`. Both clear GHSA-g3hv-75wg-m249 in app dev tooling. The 1.1.0 package pins the old peers, so apps cannot raise without a new package version.

## Package review (npm view, 2026-11-26)

| Package | Released | License | Publisher | Install scripts | Provenance |
|---|---|---|---|---|---|
| eslint 10.15.0 | 2026-11-13 | MIT | eslintbot | none | not shown |
| typescript-eslint 8.73.0 | 2026-11-16 | MIT | GitHub Actions | none | SLSA v1 |
| @typescript-eslint/typescript-estree 8.73.0 | 2026-11-16 | MIT | GitHub Actions | none | SLSA v1 |

14-day rule: waived by the user on 2026-11-26 (card #985 comment). typescript-eslint 8.74.0 exists; 8.73.0 stays as the card chose.

## Tests

`npm run check` (see PR).
