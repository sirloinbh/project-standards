# #381 Fix the package install blocking hook not blocking npm -- install

## Change

| File | Content |
|---|---|
| `templates/common/.claude/hooks/block-package-installs.mjs` and its copy | Treats `--` before the command is found only as the end of options |
| `scripts/test/package-install-hook.test.mjs` | Added block and pass cases before and after `--` |

## Decisions

- The decision function stopped at `--`, so it could not see the word after `--` that npm takes as the command. It now judges the first command word after `--`.
- Once the command is found, the decision is finished, so `npm run x -- install` and `npm test -- --watch` pass as they do now.
- An option-shaped word after `--` is not skipped as an option. npm also takes it as a non-command word.

## Checks

- The block cases in the test only check the decision. `npm -- install` was not actually run.
