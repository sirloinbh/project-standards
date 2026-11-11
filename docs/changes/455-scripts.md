# 455: Translate scripts and small templates to English

Part of #455.

## What was translated

- Comments and user-facing messages in `scripts/secret-scan.mjs`, `ioc-scan.mjs`, `sync.mjs`, `lockfiles.mjs`, `build-tokens.mjs`, `compliance.mjs`, `scaffold.mjs`, `lib/lockfiles.mjs`, `lib/inline-ci.mjs`, `lib/labels.mjs`.
- Comments in the small templates (Dockerfiles, eslint and prettier configs, `.prettierignore`, both `ci.yml` templates, `dependabot.yml`).
- `templates/index.json` descriptions and `templates/common/labels.json` descriptions (label names unchanged).
- The compliance report commit message and PR title are now English.
- `packages/design-tokens/tokens.css` and `tailwind.css` were regenerated because the generated header comments changed.

## What was kept

- Label names, the sync commit prefix, the `HEADER_TEXT` file header, and the release marker are untouched (tools match on them).

## Verification

- `grep` for Hangul over the changed files shows none left.
- `npm run check`.
