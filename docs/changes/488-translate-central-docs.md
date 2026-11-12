# Translate the remaining central docs to English (#488)

## Problem

Part of #453. Most central docs were already English (#456), but the bootstrap prompt, the package READMEs and changelogs, the package license, and the scaffold docs were still Korean.

## Change

- Translated `docs/bootstrap-prompt.md`, `packages/*/README.md`, `packages/*/CHANGELOG.md`, `packages/design-tokens/LICENSE.md`, `scaffold/app/README.md`, `scaffold/app/AGENTS.project.md`, and `scaffold/app/database/README.md`. Version headings, dates, and issue numbers are unchanged.
- Added an English gloss to the `[직접]` label in `AGENTS.md`.
- Kept Korean on purpose (code or data matches on it, or it is a quoted literal): the legacy sync commit prefix and the managed-file header, `[직접]`, the Korean `domain` values in `registry/projects.json` and the generated `docs/projects.md`, quoted UI and log messages with English glosses, and the desktop launcher file name `VSCode-계정B-...cmd`.
- Not changed: the `description`/schema text in `*.json` files (not markdown).

## Checks

- `UPDATE_SNAPSHOT=1 npm test` and `npm run check` (results in the PR).
- Hangul search over the markdown in scope lists only the kept strings above.
