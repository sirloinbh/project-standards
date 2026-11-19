# #703 Trim the package-install guard hook

User decision 2026-11-19 (option A): shrink the hook without a policy change.

## Change

`templates/common/.claude/hooks/block-package-installs.mjs` (and its copies in this repo's `.claude/hooks/` and the plugin):

- The full npm command list, the typo-alias table and the prefix and camelCase resolver are gone. One `NPM_COMMANDS` table maps the exact words and real aliases of the commands the hook acts on (install, ci, install-test, update, uninstall, exec, init, rebuild, dedupe, link, audit).
- The first word after the options decides. Any other word (`run`, `test`, `ls`) allows the call. Without this, `npm run x -- install` would read `x` (an alias of `exec`) as the command.
- Kept: `splitCommands`, `programName`, `isMainModule` (imported by `block-forbidden-commands.mjs`), `findAnyInstall` (imported by `tools/repos.mjs`), the wrapper handling, and the #629 check that an install must not turn install scripts on.

## Result

439 to 422 lines. The issue estimated about 250, but the splitter (about 115 lines) and the wrapper handling (about 90) stay by the decision, and they are most of the file. A bigger cut needs a new choice (for example dropping the wrapper handling).

## Behavior change

The hook no longer blocks abbreviations (`npm upd`), camelCase (`npm installTest`) or typo aliases (`npm isntall`). The deny list and the Codex rules still list them. The hook states it is a guard against mistakes, not a security boundary.

## Checks

`scripts/test/package-install-hook.test.mjs` updated (resolver test replaced, prefix and camelCase cases removed, new cases for exact matching and the first-word rule). `npm run self`, `npm run plugin` regenerated the copies. `npm run check` result is in the PR.
