# #247 VS Code: format with Prettier and fix with ESLint on save

## Change

| File | Content |
|---|---|
| `templates/common/.vscode/settings.json.tmpl` | `prettier.requireConfig`, format on save per language (Prettier), and `source.fixAll.eslint` on save |
| `templates/app/.vscode/extensions.json.tmpl` | 4 recommended extensions (new file, apps only) |
| `scripts/test/tools.test.mjs` | Checks the format scope, `requireConfig`, and the recommended extension list |
| `templates/app/.prettierignore.tmpl` | Added `.vscode/extensions.json` |
| `scripts/test/fixtures/sync-snapshot.json` | Added `.vscode/extensions.json` to the 8 apps |
| `docs/tools.md` | A "Format automatically on save" section |

## Decisions

- `settings.json` is a common template, so shared-aws-infrastructure also receives it. The infrastructure repo has no Prettier config, so we turned on `prettier.requireConfig: true` so that it does not format with Prettier defaults.
- Format on save is turned on only for the languages Prettier handles. Terraform files are not touched.
- The recommended extension list is only for apps that use Prettier and ESLint (`templates/app/`).
- Not applied to the central repo. It uses neither Prettier nor ESLint, and `.vscode/settings.json` is not a sync target.

## Verification

- `node --test scripts/test/tools.test.mjs`: 15 passed
- Updated the snapshot with `UPDATE_SNAPSHOT=1 npm test`. The only change is the added `.vscode/extensions.json` in the 8 apps
- Put `.vscode/extensions.json` in the managed section of the app `.prettierignore` (managed file hash check, #154)
- `npm run sync:preview`: the 8 apps receive `.vscode/extensions.json` and the changed `settings.json`, and shared-aws-infrastructure receives only `settings.json`
- `npm run check`: 464 of 465 tests passed, 1 skipped, 0 failed
