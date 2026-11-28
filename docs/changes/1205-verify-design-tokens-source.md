# #1205 Verify design-tokens releases in design-system

Every sync run failed in wave 1 (run 46092037111): `verifyPackages` looked for the release tag `design-tokens/v1.1.1` in project-standards, but the package is released from `sirloinbh/design-system` since #1165 (ADR-0031).

## Change

| File | Content |
|---|---|
| `scripts/lib/sync-pr.mjs` | `PACKAGE_SOURCE_REPOS` maps a package to its source repo (`design-tokens` to `sirloinbh/design-system`); every other package stays in project-standards. The release and the publish run are both read from that repo, and the error names it |
| `scripts/test/sync-pr.test.mjs` | A design-tokens test checks both API paths and the error message |

## Notes

The rule is unchanged: a version is trusted only with a release whose publish run is a successful `publish.yml` run. The design-system repo is public, so the central App token can read it.
