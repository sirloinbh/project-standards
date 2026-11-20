# #951 Generate the hub's own editor config from templates/common

ADR-0029 gap G3: this repo's `.vscode/settings.json` had drifted from the template. It still started `%LOCALAPPDATA%\gh-workout-memo\project-terminal.ps1`, the old tool folder `AGENTS.md` says not to use, because nothing compared it with the source.

## Change

| File | Content |
|---|---|
| `scripts/build-self.mjs` | `.editorconfig` and `.vscode/settings.json` join `SELF_COPIES`, so `npm run self` writes them and `self:check` fails when they differ |
| `.vscode/settings.json` | Regenerated: the terminal profile uses `sirloinbh-tools\project-terminal.ps1`. The format-on-save settings arrive too; they do nothing here because this repo has no Prettier or ESLint config (`prettier.requireConfig`) |
| `scripts/test/build-self.test.mjs` | The two files equal their templates, the templates have no variables, and the old folder name is gone |
| `.claude/rules/sources-and-copies.md`, `docs/tools.md`, `docs/design.md`, `docs/adr/0029-*.md` | Say that the two files are copies |

## What was decided

- `.gitattributes` is **not** copied. This repo's file has one more line (`*.cmd text eol=crlf`) for `tools/**/*.cmd`. Adding that line to the template would open a sync PR in all 11 repos, and each app merge is a deploy, for a line they do not need. `.editorconfig` was already identical.

## Checks

- `node --test scripts/test/build-self.test.mjs`: passed.
- `npm run check`: passed.
