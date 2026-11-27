# #1191 design-system is public

- Issue: [#1191](https://github.com/sirloinbh/project-standards/issues/1191)
- Branch: `docs/1191-design-system-public`
- Related: #1161 (repository created), #1158, ADR-0031

## Changes — 2026-11-27

ADR-0031 and `docs/design-system-move.md` said the design-system repository is private. User decision 2026-11-27 (#1161): it is public, like the app repositories, because branch protection needs a public repository on the free plan. Both documents now say so, and the sync-access risk is narrowed: reading needs no token; only adding it as a sync target needs the App installation.

## Verification

- `npm run check:docs`
