# #365 Align per-PC global instructions with the git CLI rules using install.ps1

## Change

| File | Content |
|---|---|
| `tools/global-instructions/git-branches.md` | Added the source of the branch rules that go into the global instructions |
| `tools/install.ps1` | Added replacing the branch section of the global instructions and cleaning up the Fork rule memory |
| `tools/check-git-permissions.mjs` | Added a command that checks this PC's actual permission decisions |
| `scripts/test/tools.test.mjs` | Added tests for section replacement, repeated runs, memory cleanup, and run conditions |
| `docs/tools.md`, `docs/user-steps.md` | Added the tool description and user step 16 |

## Decisions

- A missing global file is not created. There is no rule to conflict with, and the same rules are in each repo.
- Only a section whose title contains `Fork` or `git CLI` is replaced, and if there is no such section it is appended to the end of the file. Other sections are left as they are. The changed file and memory are kept as `.bak-<time>`.
- An install that specifies only `-Destination` does not touch the global instructions. This is so tests do not modify the real home folder.
- The permission check works by denying all approval requests. Unlike `dontAsk` mode, it can tell "approval needed" from "blocked", and commands that need approval are not run.
- Other PCs cannot be fixed from this PC. Running it on those PCs is tracked in user step 16 and #361.
